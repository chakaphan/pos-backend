module.exports = {
    routes: [
        {
            method: "POST",
            path: "/sale-transactions",
            handler: "sale-transaction.createSaleTransaction",
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
};