const { Op } = require('sequelize');
const { CPU, Manufacturer } = require('../models');
const sequelize = require('../config/database');

class StatisticsService {
  async getCPUStatistics() {
    try {
      // Use a single optimized query with materialized view for basic statistics
      const stats = await sequelize.query(`
        WITH cpu_stats AS (
          SELECT 
            COUNT(*) as total_cpus,
            AVG(score) as avg_score,
            MIN(score) as min_score,
            MAX(score) as max_score,
            AVG("priceUSD") as avg_price,
            MIN("priceUSD") as min_price,
            MAX("priceUSD") as max_price,
            AVG("nrCores") as avg_cores,
            AVG("clockSpeed") as avg_clock_speed
          FROM "CPUs"
        )
        SELECT * FROM cpu_stats
      `, { type: sequelize.QueryTypes.SELECT });

      // Optimize manufacturer distribution query with proper indexing
      const manufacturerStats = await sequelize.query(`
        SELECT 
          m.name as manufacturer_name,
          COUNT(c.id) as count,
          AVG(c.score) as average_score
        FROM "CPUs" c
        LEFT JOIN "Manufacturers" m ON c."manufacturerId" = m.id
        GROUP BY m.name
        ORDER BY count DESC
      `, { type: sequelize.QueryTypes.SELECT });

      // Optimize series and generation distribution with a single query
      const seriesAndGenerationStats = await sequelize.query(`
        SELECT 
          series,
          generation,
          COUNT(*) as count,
          AVG(score) as average_score
        FROM "CPUs"
        GROUP BY series, generation
        ORDER BY series, generation
      `, { type: sequelize.QueryTypes.SELECT });

      // Optimize price range distribution with a single query
      const priceRangeStats = await sequelize.query(`
        WITH price_ranges AS (
          SELECT 
            CASE 
              WHEN "priceUSD" < 300 THEN '<$300'
              WHEN "priceUSD" < 500 THEN '$300-$500'
              WHEN "priceUSD" < 700 THEN '$500-$700'
              ELSE '>$700'
            END as price_range
          FROM "CPUs"
        )
        SELECT 
          price_range,
          COUNT(*) as count
        FROM price_ranges
        GROUP BY price_range
        ORDER BY 
          CASE price_range
            WHEN '<$300' THEN 1
            WHEN '$300-$500' THEN 2
            WHEN '$500-$700' THEN 3
            ELSE 4
          END
      `, { type: sequelize.QueryTypes.SELECT });

      return {
        general: stats[0],
        manufacturers: manufacturerStats,
        seriesAndGenerations: seriesAndGenerationStats,
        priceRanges: priceRangeStats
      };
    } catch (error) {
      console.error('Error calculating statistics:', error);
      throw error;
    }
  }

  async getPerformanceComparison(manufacturerId) {
    try {
      const comparison = await sequelize.query(`
        SELECT 
          series,
          generation,
          AVG(score) as average_score,
          AVG("priceUSD") as average_price,
          AVG("nrCores") as average_cores,
          AVG("clockSpeed") as average_clock_speed
        FROM "CPUs"
        WHERE "manufacturerId" = :manufacturerId
        GROUP BY series, generation
        ORDER BY series, generation
      `, {
        replacements: { manufacturerId },
        type: sequelize.QueryTypes.SELECT
      });

      return comparison;
    } catch (error) {
      console.error('Error calculating performance comparison:', error);
      throw error;
    }
  }

  async getPricePerformanceRatio() {
    try {
      const ratio = await sequelize.query(`
        SELECT 
          model,
          score,
          "priceUSD",
          score / "priceUSD" as price_performance_ratio
        FROM "CPUs"
        ORDER BY price_performance_ratio DESC
        LIMIT 10
      `, { type: sequelize.QueryTypes.SELECT });

      return ratio;
    } catch (error) {
      console.error('Error calculating price-performance ratio:', error);
      throw error;
    }
  }

  async getPerformanceTrends() {
    try {
      // First, create a materialized view for performance trends if it doesn't exist
      await sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS cpu_performance_trends AS
        WITH manufacturer_stats AS (
          SELECT 
            m.name as manufacturer,
            c.series,
            c.generation,
            AVG(c.score) as avg_score,
            AVG(c."priceUSD") as avg_price,
            AVG(c."nrCores") as avg_cores,
            AVG(c."clockSpeed") as avg_clock_speed,
            COUNT(*) as total_models,
            MIN(c."releaseDate") as first_release,
            MAX(c."releaseDate") as latest_release
          FROM "CPUs" c
          JOIN "Manufacturers" m ON c."manufacturerId" = m.id
          GROUP BY m.name, c.series, c.generation
        ),
        performance_metrics AS (
          SELECT 
            manufacturer,
            series,
            generation,
            avg_score,
            avg_price,
            avg_cores,
            avg_clock_speed,
            total_models,
            first_release,
            latest_release,
            avg_score / avg_price as price_performance_ratio,
            LAG(avg_score) OVER (
              PARTITION BY manufacturer, series 
              ORDER BY generation
            ) as prev_generation_score
          FROM manufacturer_stats
        )
        SELECT 
          manufacturer,
          series,
          generation,
          avg_score,
          avg_price,
          avg_cores,
          avg_clock_speed,
          total_models,
          first_release,
          latest_release,
          price_performance_ratio,
          CASE 
            WHEN prev_generation_score IS NULL THEN NULL
            ELSE ((avg_score - prev_generation_score) / prev_generation_score) * 100
          END as performance_improvement_percentage
        FROM performance_metrics
        ORDER BY manufacturer, series, generation;
      `);

      // Create indices for faster querying
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_cpu_manufacturer ON "CPUs" ("manufacturerId");
        CREATE INDEX IF NOT EXISTS idx_cpu_series_gen ON "CPUs" (series, generation);
        CREATE INDEX IF NOT EXISTS idx_cpu_score ON "CPUs" (score);
        CREATE INDEX IF NOT EXISTS idx_cpu_price ON "CPUs" ("priceUSD");
      `);

      // Refresh the materialized view
      await sequelize.query('REFRESH MATERIALIZED VIEW cpu_performance_trends;');

      // Query the materialized view with additional aggregations
      const trends = await sequelize.query(`
        WITH trend_analysis AS (
          SELECT 
            manufacturer,
            series,
            generation,
            avg_score,
            avg_price,
            avg_cores,
            avg_clock_speed,
            total_models,
            first_release,
            latest_release,
            price_performance_ratio,
            performance_improvement_percentage,
            AVG(avg_score) OVER (PARTITION BY manufacturer) as manufacturer_avg_score,
            AVG(avg_price) OVER (PARTITION BY manufacturer) as manufacturer_avg_price,
            AVG(price_performance_ratio) OVER (PARTITION BY manufacturer) as manufacturer_avg_price_performance
          FROM cpu_performance_trends
        )
        SELECT 
          manufacturer,
          series,
          generation,
          avg_score,
          avg_price,
          avg_cores,
          avg_clock_speed,
          total_models,
          first_release,
          latest_release,
          price_performance_ratio,
          performance_improvement_percentage,
          manufacturer_avg_score,
          manufacturer_avg_price,
          manufacturer_avg_price_performance,
          CASE 
            WHEN avg_score > manufacturer_avg_score THEN 'Above Average'
            WHEN avg_score < manufacturer_avg_score THEN 'Below Average'
            ELSE 'Average'
          END as performance_category,
          CASE 
            WHEN price_performance_ratio > manufacturer_avg_price_performance THEN 'Better Value'
            WHEN price_performance_ratio < manufacturer_avg_price_performance THEN 'Worse Value'
            ELSE 'Average Value'
          END as value_category
        FROM trend_analysis
        ORDER BY manufacturer, series, generation;
      `, { type: sequelize.QueryTypes.SELECT });

      // Calculate summary statistics
      const summary = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT manufacturer) as total_manufacturers,
          COUNT(DISTINCT series) as total_series,
          COUNT(DISTINCT generation) as total_generations,
          AVG(avg_score) as overall_avg_score,
          AVG(avg_price) as overall_avg_price,
          AVG(price_performance_ratio) as overall_avg_price_performance,
          AVG(performance_improvement_percentage) as avg_performance_improvement
        FROM cpu_performance_trends
        WHERE performance_improvement_percentage IS NOT NULL;
      `, { type: sequelize.QueryTypes.SELECT });

      return {
        trends: trends,
        summary: summary[0]
      };
    } catch (error) {
      console.error('Error calculating performance trends:', error);
      throw error;
    }
  }
}

module.exports = new StatisticsService(); 