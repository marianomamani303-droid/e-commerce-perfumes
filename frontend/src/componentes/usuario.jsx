
import { useEffect, useState } from "react";

function UsuarioCard() {
    const id_usuario = localStorage.getItem("id");

    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        async function mostrarDatos() {
            if (!id_usuario) {
                return;
            }

            try {
                const respuesta = await fetch(
                    "https://ecommerce-backend-xqxo.onrender.com/mostrarDatos",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            id: id_usuario
                        })
                    }
                );

                if (!respuesta.ok) {
                    throw new Error(
                        `Error HTTP: ${respuesta.status}`
                    );
                }

                const datos = await respuesta.json();

                setNombre(datos.nombre);
                setEmail(datos.email);

            } catch (error) {
                console.error(
                    "Error al obtener los datos del usuario:",
                    error
                );
            }
        }

        mostrarDatos();
    }, [id_usuario]);

    function cerrarSesion() {
        localStorage.removeItem("id")
        localStorage.removeItem("rol")
        location.reload()
    }

    return (
        <div className="mostrar_usuario">

            <p>{nombre}</p>

            <p>{email}</p>

            <button onClick={cerrarSesion}>
                Cerrar sesión
            </button>

        </div>
    );
}

export default UsuarioCard;

