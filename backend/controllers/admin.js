import pool from "../config/config.js";
import mysql from "mysql2/promise";
import express from "express"

const guardar_productos = async (req, res) => {
  try {
    const {
      nombre,
      marca,
      categoria,
      descripcion,
      precio,
      oferta,
      stock,
      sku,
      tamano
    } = req.body;

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({
        mensaje: "La imagen es obligatoria"
      });
    }

    const imagen = req.file.filename;

    await pool.execute(
      `INSERT INTO productos
      (nombre, marca, categoria, descripcion, precio, oferta, stock, imagen, sku, tamano)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        marca,
        categoria,
        descripcion,
        precio,
        oferta,
        stock,
        imagen,
        sku,
        tamano
      ]
    );

    res.status(201).json({
      mensaje: "Producto guardado"
    });

  } catch (error) {
    console.error("ERROR REAL:", error);

    res.status(500).json({
      mensaje: "Error al guardar producto",
      error: error.message
    });
  }
};

const obtener_productos = async (req,res)=>{
  try {
    const [filas] = await pool.execute("SELECT * FROM productos")
    console.log(filas)
    res.json(filas)
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al mostrar producto"
    });
  }
}


const eliminar_productoB = async (req,res)=>{
  try {
    const {id_producto} = req.body
    await pool.execute("DELETE FROM productos WHERE id = ?",[id_producto])
  } catch (error) {
    res.status(500).json({
      mensaje: error
    });
  }
}

export {guardar_productos,obtener_productos,eliminar_productoB}