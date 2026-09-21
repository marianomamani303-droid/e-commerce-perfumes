import "../css/variables.css"
import "../css/registrarse.css"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import NavBar from "../componentes/navbar"


function InicioDeSesion(){


    const [cambiarpag,setcambiarpag] = useState(true)

    return(
        <>
        <NavBar/>
            {
                cambiarpag
                ? <Registro setcambiarpag={setcambiarpag}/>
                : <Login setcambiarpag={setcambiarpag}/>
            }
        </>
    )
}


function Registro({setcambiarpag}){

    const [contenido,setcontenido] = useState({
        nombre:"",
        email:"",
        password:"",
        confirmpassword:""
    })


    async function registroEnvio(e){

        e.preventDefault()

        try{

            const respuesta = await fetch(
                "https://ecommerce-backend-xqxo.onrender.com/usuarios",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify(contenido)
                }
            )

            const datos = await respuesta.json()

            localStorage.setItem("id", datos.id)
            localStorage.setItem("rol", datos.rol)

        }catch(error){

            console.error(error)

        }

    }


    return(
        <section className="registro-card">

            <h1>Crear cuenta</h1>

            <p>
                Registrate para disfrutar de nuestras fragancias exclusivas.
            </p>

            <form className="registro-formulario" onSubmit={registroEnvio}>

                <div className="campo">
                    <label>Nombre</label>
                    <input 
                    type="text"
                    placeholder="Ingrese su nombre"
                    onChange={(e)=>setcontenido({
                        ...contenido,
                        nombre:e.target.value
                    })}
                    />
                </div>


                <div className="campo">
                    <label>Email</label>
                    <input 
                    type="email"
                    placeholder="Ingrese su email"
                    onChange={(e)=>setcontenido({
                        ...contenido,
                        email:e.target.value
                    })}
                    />
                </div>


                <div className="campo">
                    <label>Contraseña</label>
                    <input 
                    type="password"
                    placeholder="Ingrese su contraseña"
                    onChange={(e)=>setcontenido({
                        ...contenido,
                        password:e.target.value
                    })}
                    />
                </div>


                <div className="campo">
                    <label>Confirmar contraseña</label>
                    <input 
                    type="password"
                    placeholder="Repita su contraseña"
                    onChange={(e)=>setcontenido({
                        ...contenido,
                        confirmpassword:e.target.value
                    })}
                    />
                </div>


                <button type="submit">
                    Registrarse
                </button>

            </form>


            <p onClick={()=>setcambiarpag(false)}>
                ¿Ya tenés cuenta? Iniciá sesión.
            </p>

        </section>
    )
}



function Login({setcambiarpag}){
  const navigate = useNavigate()


    const [datos,setdatos] = useState({
        email:"",
        password:""
    })


    async function loginEnvio(e){

        e.preventDefault()

        try{

            const loginrespuesta = await fetch(
                "https://ecommerce-backend-xqxo.onrender.com/login",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify(datos)
                }
            )


            const dato = await loginrespuesta.json()

            if(dato.rol === "admin"){
               navigate("/dashboard")
            }
            


            if(dato.id){

                localStorage.setItem("id", dato.id)
                localStorage.setItem("rol", dato.rol)
                location.reload()

            }
            


            if(dato.msg === "contraseña incorrecta"){
                alert("Contraseña incorrecta")
            }


            if(dato.msg === "email incorrecto"){
                alert("Email incorrecto")
            }


        }catch(error){

            console.error(error)

        }

    }


    return(
        <section className="login-card">

            <h1>Inicia sesión</h1>

            <p>
                Inicia sesión para disfrutar de nuestras fragancias exclusivas.
            </p>


            <form className="login-formulario" onSubmit={loginEnvio}>


                <div className="campo">
                    <label>Email</label>

                    <input
                    type="email"
                    placeholder="Ingrese su email"
                    onChange={(e)=>setdatos({
                        ...datos,
                        email:e.target.value
                    })}
                    />
                </div>


                <div className="campo">
                    <label>Contraseña</label>

                    <input
                    type="password"
                    placeholder="Ingrese su contraseña"
                    onChange={(e)=>setdatos({
                        ...datos,
                        password:e.target.value
                    })}
                    />
                </div>


                <button type="submit">
                    Iniciar sesión
                </button>

            </form>


            <p onClick={()=>setcambiarpag(true)}>
                ¿No tenés una cuenta? Creá una.
            </p>

        </section>
    )
}


export default InicioDeSesion