import {MercadoPagoConfig,Preference} from "mercadopago"
import "dotenv/config";

const client = new MercadoPagoConfig({
    accessToken:process.env.MP_ACCESS_TOKEN
})

const preference = new Preference(client)

export {preference}