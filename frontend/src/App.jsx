import './css/App.css'
import "./css/variables.css"
import Dashboard from "./pages/dashboardAdmin"
import { useState,useEffect } from 'react'
import { Link } from 'react-router-dom'
import Carrito from "./componentes/carrito"
import { Routes, Route } from "react-router-dom"
import Login from "./pages/registrarse"
import PagProducto from "./pages/productod"
import NavBar from './componentes/navbar'


function Inicio(){

    return(
        <>
        <NavBar/>
            <header className="hero">
                <div className="hero-content">
                    <h1>
                        Encontrá tu fragancia ideal
                    </h1>
                </div>
            </header>
            <Carrito/>
            <Home/>
        </>
    )
}



function App(){

    return(

        <>

            <Routes>

                <Route
                path="/"
                element={<Inicio/>}
                />


                <Route
                path="/login"
                element={<Login/>}
                />


                <Route
                path="/dashboard"
                element={<Dashboard/>}
                />


                <Route
                path="/producto/:id"
                element={<PagProducto/>}
                />

            </Routes>


        </>

    )

}



function Home(){

const [product,setproduct] = useState([])



useEffect(()=>{

    async function mostprodfrontend(){

        try{

            const filasProd = await fetch(
                "https://ecommerce-backend-xqxo.onrender.com/mostProdFrontend"
            )


            if(!filasProd.ok){

                throw new Error(
                    "Error al obtener productos"
                )

            }


            const datosProd = await filasProd.json()

            setproduct(datosProd)


        }catch(error){

            console.error(error)

        }

    }


    mostprodfrontend()


},[])



return(

    <main>


        <section className="seccion-productos catalogo">

            <h2>
                Todos nuestros perfumes
            </h2>


            <div className="grid-productos">


                {
                    product.map((product)=>(

                        <div
                        className="producto-card"
                        key={product.id}
                        >

                            <img
                            src={`https://ecommerce-backend-xqxo.onrender.com/uploads/${product.imagen}`}
                            alt="imagen del producto"
                            className="imagen-producto"
                            />


                            <h3>
                                {product.nombre}
                            </h3>


                            <p>
                                {product.precio}
                            </p>


                            <Link to={`/producto/${product.id}`}>
                                Ver producto
                            </Link>


                        </div>

                    ))
                }


            </div>


        </section>



        <section className="banner-marca">


            <h2>
                Una fragancia cuenta una historia
            </h2>


            <p>
                Elegimos perfumes únicos para acompañarte en cada momento.
            </p>


            <button>
                Conocer colección
            </button>


        </section>


    </main>

)

}


export default App