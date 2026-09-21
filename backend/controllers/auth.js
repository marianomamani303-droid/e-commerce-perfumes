import pool from "../config/config.js";
import mysql from "mysql2/promise";
import express from "express"
import bcrypt from "bcrypt";

const registro = async (req, res) => {
    const { nombre, email, password, confirmpassword } = req.body;
    

    try {
        const [filas] = await pool.query(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );

        if (filas.length > 0) {
            return res.json({
                msg: "El usuario ya existe"
            });
        }

        if (password !== confirmpassword) {
            return res.json({
                msg: "Las contraseñas no coinciden"
            });
        }
        const hash = await bcrypt.hash(password,10)

        const [resultado] = await pool.execute(
            "INSERT INTO usuarios (nombre,email,password) VALUES (?,?,?)",
            [nombre, email, hash]
        );

        res.json({
            msg: "Usuario creado",
            id: resultado.insertId
        });


    } catch (error) {

        res.status(500).json({
            msg: "Error del servidor"
        });
    }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [fila] = await pool.execute(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    if (fila.length === 0) {
      return res.status(404).json({
        msg: "email incorrecto"
      });
    }

    const usuario = fila[0];

    const coincidencia = await bcrypt.compare(
      password,
      usuario.password
    );

    if (!coincidencia) {
      return res.status(401).json({
        msg: "contraseña incorrecta"
      });
    }



    return res.status(200).json({
      id: usuario.id,
      rol: usuario.rol
    });
    
  } catch (error) {

    return res.status(500).json({
      msg: "Error del servidor"
    });
  }
};

const mostrar_datos = async (req, res) => {
    try {
        const { id } = req.body;

        const [filas] = await pool.execute(
            "SELECT * FROM usuarios WHERE id = ?",
            [id]
        );

        if (filas.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        res.json({
            nombre: filas[0].nombre,
            email: filas[0].email
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error del servidor"
        });
    }
};

export { registro,login,mostrar_datos };

