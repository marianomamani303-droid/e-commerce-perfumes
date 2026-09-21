import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import "../css/productoinfo.css"
import Navbar from "../componentes/navbar"

function PagProducto(){

    const [infoprod,setinfoprod] = useState(null)

    const {id} = useParams()

    const id_usuario = localStorage.getItem("id")


    async function agregarCarrito(){

        if(!id_usuario){
            alert("aun no has iniciado sesion")
            return
        }

        try{

            const idUsuario = localStorage.getItem("id")

            const respuesta = await fetch("https://ecommerce-backend-xqxo.onrender.com/carrito",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    id_producto:id,
                    id_usuario:idUsuario
                })
            })

            if(!respuesta.ok){
                throw new Error("No se pudo agregar el producto al carrito.")
            }

            const datos = await respuesta.json()

            alert(datos.msg)

        }catch(error){
           console.log(error)
            alert("Ocurrió un error al agregar el producto al carrito.")

        }

    }


    useEffect(()=>{

        async function obtenerInfo(){

            try{

                const respuesta = await fetch("https://ecommerce-backend-xqxo.onrender.com/productoInfo",{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        id:id
                    })
                })

                const info = await respuesta.json()

                setinfoprod(info)

            }catch(error){
                console.log(error)
            }

        }

        obtenerInfo()

    },[id])


    if(!infoprod){

        return <h2>Cargando...</h2>

    }


    return(

        <>

        <Navbar/>

            <main className="pagina-producto">

                <section className="producto">

                    <div className="producto-imagen">

                        <img
                            src={`https://ecommerce-backend-xqxo.onrender.com/uploads/${infoprod.imagen}`}
                            alt={infoprod.nombre}
                            className="imagen-infoprod"
                        />

                    </div>


                    <div className="producto-info">

                        <span className="categoria">
                            {infoprod.categoria}
                        </span>


                        <h1>
                            {infoprod.nombre}
                        </h1>


                        <p className="marca">
                            {infoprod.marca}
                        </p>


                        <p className="precio">
                            ${infoprod.precio}
                        </p>


                        <p className="descripcion">
                            {infoprod.descripcion}
                        </p>


                        <div className="datos">

                            <div className="dato">
                                <span>Stock</span>
                                <p>{infoprod.stock}</p>
                            </div>

                            <div className="dato">
                                <span>Tamaño</span>
                                <p>{infoprod.tamano}</p>
                            </div>

                            <div className="dato">
                                <span>SKU</span>
                                <p>{infoprod.sku}</p>
                            </div>

                            <div className="dato">
                                <span>Estado</span>
                                <p>{infoprod.estado}</p>
                            </div>

                        </div>


                        <button 
                            className="btn-comprar" 
                            onClick={agregarCarrito}
                        >
                            Agregar al carrito
                        </button>

                    </div>

                </section>

            </main>
        </>

    )

}

export default PagProducto