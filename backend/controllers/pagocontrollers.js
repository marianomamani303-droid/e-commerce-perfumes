import { preference } from "../config/mercadopago.js";

const crearpago = async (req, res) => {
    try {

        const { productos } = req.body;

        const items = productos.map(producto => ({
            title: producto.nombre,
            quantity: 1,
            unit_price: Number(producto.precio)
        }));


        const resultado = await preference.create({
            body: {
                items,

                back_urls: {
    success: "https://tu-url.ngrok.io/pago-exitoso",
    failure: "https://tu-url.ngrok.io/pago-fallido",
    pending: "https://tu-url.ngrok.io/pago-pendiente"
},
auto_return: "approved"}
        });


        res.json({
            id: resultado.id
        });


    }catch(error) {

    res.status(500).json({
        mensaje: error.message
    });
}
};


export {crearpago};