"use strict"

module.exports = {
    async createSaleTransaction(ctx) {
        try {
            const { data } = ctx.request.body;

            const result = await strapi.db.transaction(async ({ trx }) => {
                const sale = await strapi.entityService.create("api::sale.sale", {
                    data: {
                        customer_name: data.customer_name,
                        invoice_number: data.invoice_number,
                        customer_email: data.customer_email,
                        customer_phone: data.customer_phone,
                        date: data.date,
                        notes: data.notes,
                        products: data.products.map((item) =>({
                            product: item.product,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                        subtotal: data.subtotal,
                        discount_amount: data.discount_amount,
                        tax_amount: data.tax_amount,
                        total: data.total
                    },

                    transaction: { trx },
                });

                for (const productItem of data.products) {
                    try {
                        const product = await strapi.entityService.findOne(
                            "api::product.product",
                            productItem.product,
                            {
                                transaction: { trx },
                            }
                        );

                        if(!product){
                            throw new Error(
                                `Product with ID ${productItem.product} not found`
                            );
                        }

                        const updatedStock = product.stock - productItem.quantity;

                        if(updatedStock < 0){
                            throw new Error(
                                `Insufficient stock for product with ID ${productItem.product}`
                            );
                        }

                        await strapi.entityService.update(
                            "api::product.product",
                            productItem.product,
                            {
                                data: { stock: updatedStock },
                                transaction: { trx },
                            }
                        )
                    } catch (err) {
                        console.error(
                            `Error processing product ${productItem.product}:`,
                            err
                        );
                    }
                }
                return sale;
            });

            return { data: result, meta: {success: true} };
        } catch (error) {
            console.error("Transaction error:", error);
            ctx.throw(500, error.message);
        }
    },
};