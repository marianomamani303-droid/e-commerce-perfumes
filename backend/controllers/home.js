import pool from "../config/config.js";
import mysql from "mysql2/promise";
import express from "express"

const mostProdFrontend = async(req,res)=>{
    try {
        const [filas] = await pool.execute("SELECT * FROM productos ")
        res.json(filas)
    } catch (error) {
        res.status(500).json({
            msg:"error al obtener los productos"
        })
    }
} 
const mostInfoProd = async(req,res)=>{
    try {
        const {id} = req.body
        const [infoprod] = await pool.execute("SELECT * FROM productos WHERE id = ?",[id])
        res.json(infoprod[0])
    } catch (error) {
        res.status(500).json({
            msg: "Error al obtener el producto"
        });

    }
}

const carrito = async (req, res) => {
  try {
    const { id_producto, id_usuario } = req.body;

    await pool.execute(
      "INSERT INTO carrito (id_usuario, id_producto) VALUES (?, ?)",
      [id_usuario, id_producto]
    );
    res.json({
      msg: "Producto agregado al carrito"
    });

  } catch (error) {
    res.status(500).json({
      msg: "Error al agregar el producto"
    });
  }
};

const mostrarCarrito = async (req, res) => {
  try {
    const { id_usuario } = req.body;

    const [filas] = await pool.execute(
      "SELECT * FROM carrito WHERE id_usuario = ?",
      [id_usuario]
    );

    const productosCarrito = [];

    for (const fila of filas) {
      const [productos] = await pool.execute(
        "SELECT * FROM productos WHERE id = ?",
        [fila.id_producto]
      );

      productosCarrito.push({
        id_carrito: fila.id, // id de la fila del carrito
        ...productos[0]      // datos del producto
      });
    }

    res.json(productosCarrito);

  } catch (error) {
    console.log(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

const eliminar_producto = async (req,res)=>{
  try {
    const {id_carrito} = req.body
    await pool.execute(
    "DELETE FROM carrito WHERE id = ?",
    [id_carrito]
    );

    res.json({
      mensaje: "Producto eliminado del carrito"
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor" });
  }
}


const limpiar_carrito = async (req,res)=>{
  try {
    const {id_usuario} = req.body
    await pool.execute("DELETE FROM carrito WHERE id_usuario = ?",[id_usuario])
    res.json({
      msg:"carrito eliminado"
    })
  } catch (error) {
    res.status(500).json({ msg: "Error del servidor" });
  }
}


export {mostProdFrontend,mostInfoProd,carrito,mostrarCarrito,eliminar_producto,limpiar_carrito}