import { useState,useEffect } from "react"
import { Link } from "react-router-dom"
import MostrarUsuario from "./usuario"


function NavBar(){

  const id_usuario = localStorage.getItem("id")

  const [logueado,setlogueado] = useState(false)

  const [desplegar,setdesplegar] =useState("nodesplegar")



  useEffect(()=>{

    function sesion_iniciada(){

      if(id_usuario){
        setlogueado(true)
      }
      else{
        setlogueado(false)
      }

    }

    sesion_iniciada()

  },[id_usuario])



return(
  <>

    <nav className="navegacion">

      <h1>
        airbell
      </h1>


      <div className='navegacion_opciones'>

        <div className="links">

          <Link to="/">
            Pagina principal
          </Link>


          {
          !logueado &&

          <Link to="/login">
            Inicio de sesión
          </Link>
          }


          {
          logueado &&

          <div className="usuario" onClick={() => {
            setdesplegar(desplegar === "nodesplegar" ? "desplegar" : "nodesplegar")
          }}>

            <p>
              Usuario
            </p>

          {
            desplegar === "desplegar" && <MostrarUsuario desplegar={desplegar}/>
          }

          </div>

          }


        </div>

      </div>


    </nav>

  </>
)

}


export default NavBar
