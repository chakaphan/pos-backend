"use strict"

module.exports = {
    async getSummary(ctx){
        try {
            const { period } = ctx.params;

            const now = new Date();
            let startDate, endDate;

            switch (period) {
                case "last-month":
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date();
                    break;
                case "two-weeks":
                    startDate = new Date();
                    startDate.setDate(now.getDate() - 15);
                    endDate = new Date();
                    break;
                case "week":
                    startDate = new Date();
                    startDate.setDate(now.getDate() - 7);
                    endDate = new Date();
                    break;
                default:
                    return ctx.badRequest(400, "Invalid period specified.");
            }

            const startTimestamp = startDate.getTime();
            const endTimestamp = endDate.getTime();
            const formattedStartDate = startDate.toISOString();
            const formattedEndDate = endDate.toISOString();

            const db = strapi.db;

            const salesModel = "api::sale.sale";

            const tableInfo = db.metadata.get(salesModel);
            if (!tableInfo) {
                throw ctx.notFound("Sale table not found");
            }

            const tableName = tableInfo.tableName;

            const results = await db
                .connection(tableName)
                .whereBetween("date", [startTimestamp, endTimestamp])
                .select(
                    db.connection.raw("COUNT(*) as count"),
                    db.connection.raw("SUM(subtotal) as total_sales"),
                    db.connection.raw("SUM(tax_amount) as total_tax"),
                    db.connection.raw("SUM(discount_amount) as total_discount"),
                    db.connection.raw("SUM(total) as net_revenue")
                )
                .first();

                const summary = {
                    period,
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    count: parseInt(results?.count || 0, 10),
                    totalSales: parseInt(results?.total_sales || 0),
                    totalTax: parseFloat(results?.total_tax || 0),
                    totalDiscount: parseFloat(results?.total_discount || 0),
                    totalRevenue: parseFloat(results?.net_revenue || 0)
                };

                return { data: summary };
        }
        catch (error) {
            console.error("Error in getSummary:", error);
            return ctx.throw(500, "An error occurred while fetching the sale summary.");
        }
    },

    async getAllSummaries(ctx){
        const periods = ["month", "last-month",  "two-weeks", "week"];
        const summaries = {};

        for (const period of periods) {
            const periodCtx = { ...ctx, params: { period } };
            const result = await this.getSummary(periodCtx);
            summaries[period] = result.data;
        }
        return { data: summaries };
    },

    async getChartsData(ctx){
        try {
            const now = new Date();

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const sales = await strapi.entityService.findMany("api::sale.sale", {
                filters: {
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    },
                },
                fields: ["date", "total"],
                pagination: { limit: -1 },
                sort: ["date:asc"],
            });

            ctx.body = sales;
        } catch (error) {
            console.error("Error in getChartsData:", error);
            return ctx.throw(500, "An error occurred while fetching the chart data.");
        }
    },
}