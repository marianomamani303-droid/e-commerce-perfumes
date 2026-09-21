import { useState,useEffect } from "react"
import "../css/carrito.css"

import {
  Wallet,
  initMercadoPago
} from "@mercadopago/sdk-react"

initMercadoPago("APP_USR-8f48c723-74a9-4376-bd9c-ef9963fa7a4a")


function AgregarCarrito(){

  const [carritoAbierto,setCarritoAbierto] = useState(false)
  const [carrito,setCarrito] = useState([])
  const [precio,setPrecio] = useState(0)
  const [preferenceId,setPreferenceId] = useState(null)

  const idUsuario = localStorage.getItem("id")


  // Calcular total
  useEffect(()=>{

    const total = carrito.reduce(
      (acumulado,producto)=>
      acumulado + Number(producto.precio),
      0
    )

    setPrecio(total)

  },[carrito])


  // Obtener carrito
  useEffect(()=>{

    async function cargarCarrito(){

      try{

        const respuesta = await fetch(
          "https://ecommerce-backend-xqxo.onrender.com/agregarCarrito",
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json"
            },
            body:JSON.stringify({
              id_usuario:idUsuario
            })
          }
        )

        const datos = await respuesta.json()

        setCarrito(datos)

      }catch(error){

        console.log(error)

      }

    }

    cargarCarrito()

  },[idUsuario])


  // Crear pago
  async function crearPago(){

    try{

      const respuesta = await fetch(
        "https://ecommerce-backend-xqxo.onrender.com/api/pago",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            productos:carrito
          })
        }
      )

      const data = await respuesta.json()

      setPreferenceId(data.id)

    }catch(error){

      console.log(error)

    }

  }


  // Eliminar producto
  async function eliminarProducto(id){

    try{

      const respuesta = await fetch(
        "https://ecommerce-backend-xqxo.onrender.com/eliminarCarrito",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            id_carrito:id
          })
        }
      )

      if(!respuesta.ok)
        throw new Error("Error eliminando producto")


      setCarrito(
        carrito.filter(
          producto=>producto.id_carrito !== id
        )
      )

    }catch(error){

      console.log(error)

    }

  }


  // Vaciar carrito
  async function limpiarCarrito(){

    try{

      const respuesta = await fetch(
        "https://ecommerce-backend-xqxo.onrender.com/eliminarTodoCarrito",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            id_usuario:idUsuario
          })
        }
      )

      if(!respuesta.ok)
        throw new Error("Error limpiando carrito")


      setCarrito([])

    }catch(error){

      console.log(error)

    }

  }


  return(
    <>

      <div className={`carrito ${
        carritoAbierto ? "desplegar2" : "ocultar2"
      }`}>

        <h2>
          Mi carrito
        </h2>

        {
          carrito.length === 0 ?

          <p>
            El carrito está vacío
          </p>

          :

          carrito.map(producto=>(

            <div
            className="producto-carrito"
            key={producto.id_carrito}
            >

              <img
              className="imagen-carrito"
              src={`https://ecommerce-backend-xqxo.onrender.com/uploads/${producto.imagen}`}
              alt={producto.nombre}
              />

              <div>

                <h3>
                  {producto.nombre}
                </h3>

                <p>
                  {producto.descripcion}
                </p>

                <p>
                  ${producto.precio}
                </p>

                <button
                onClick={()=>
                  eliminarProducto(producto.id_carrito)
                }>
                  Eliminar
                </button>

              </div>

            </div>

          ))
        }


        {
          carrito.length > 0 &&

          <>
            <button
            className="limpiar-carrito"
            onClick={limpiarCarrito}>
              Vaciar carrito
            </button>

            <button onClick={crearPago}>
              Comprar
            </button>
          </>
        }


        {
          preferenceId &&
          <BotonPago preferenceId={preferenceId}/>
        }

      </div>


      <div
      className="icon-carrito"
      onClick={()=>
        setCarritoAbierto(
          anterior=>!anterior
        )
      }>

        <h3>
          Productos: {carrito.length}
        </h3>

        <p>
          Total: ${precio}
        </p>

      </div>

    </>
  )
}


function BotonPago({preferenceId}){

  return(
    <Wallet
      initialization={{
        preferenceId
      }}
    />
  )

}


export default AgregarCarrito