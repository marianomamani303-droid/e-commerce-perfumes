import express from "express";
import cors from "cors";

import { registro, login,mostrar_datos } from "./controllers/auth.js";
import { guardar_productos, obtener_productos,eliminar_productoB } from "./controllers/admin.js";
import { mostProdFrontend, mostInfoProd, carrito, mostrarCarrito, eliminar_producto, limpiar_carrito } from "./controllers/home.js";

import { crearpago } from "./controllers/pagocontrollers.js";

import upload from "./config/multer.js";


const app = express();


app.use(cors());
app.use(express.json());


app.use("/uploads", express.static("uploads"));


// Usuarios
app.post("/usuarios", registro);
app.post("/login", login);
app.post("/mostrarDatos",mostrar_datos)


// Productos
app.post(
    "/productos",
    upload.single("imagen"),
    guardar_productos
);

app.get("/mostrarProductosDashboard", obtener_productos);
app.get("/mostProdFrontend", mostProdFrontend);
app.post("/productoInfo", mostInfoProd);
app.post("/eliminarProductoB",eliminar_productoB)


// Carrito
app.post("/carrito", carrito);
app.post("/agregarCarrito", mostrarCarrito);
app.post("/eliminarCarrito", eliminar_producto);
app.post("/eliminarTodoCarrito", limpiar_carrito);


// Mercado Pago
app.post("/api/pago", crearpago);



app.listen(3000, () => {
    console.log("Servidor corriendo en el puerto 3000");
});



