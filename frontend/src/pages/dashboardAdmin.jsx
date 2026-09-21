import "../css/variables.css"
import "../css/dashboard.css"
import "../css/mostrarproductod.css"
import { useState,useEffect } from "react";
import icon from "../assets/icons8-menu.svg"
import { Navigate } from "react-router-dom"
import NavBar from "../componentes/navbar" 



function Dashboard() {
  const rol = localStorage.getItem("rol");

  const [desplegar, setdesplegar] = useState("desplegar");
  const [clickAP, setclickAP] = useState(false);
  const [clickPA, setclickPA] = useState(false);

  if (rol !== "admin") {
    return <Navigate to="/" replace />;
  }

  const mostraAP = () => {
    setclickAP(true);
    setclickPA(false);
  };

  const mostraPA = () => {
    setclickPA(true);
    setclickAP(false);
  };

  return (
    <>
      <NavBar />

      <div className={`side-bar ${desplegar}`}>
        <img
          src={icon}
          alt="menu"
          width="50"
          className="menu-icon"
          onClick={() =>
            setdesplegar(
              desplegar === "desplegar"
                ? "ocultar"
                : "desplegar"
            )
          }
        />

        <div className="opciones-dashboard">
          <button onClick={mostraAP}>
            Agregar producto
          </button>

          <button onClick={mostraPA}>
            Productos agregados
          </button>
        </div>
      </div>

      <main className={`contenido-dashboard ${desplegar}`}>
        {!clickAP && !clickPA && (
          <AgregarProducto desplegar={desplegar} />
        )}

        {clickAP && (
          <AgregarProducto desplegar={desplegar} />
        )}

        {clickPA && (
          <MostrarProductos desplegar={desplegar} />
        )}
      </main>
    </>
  );
}





function AgregarProducto({ desplegar }) {
  const [producto, setProducto] = useState({
    nombre: "",
    marca: "",
    categoria: "",
    descripcion: "",
    precio: "",
    oferta: "",
    stock: "",
    imagen: "",
    sku: "",
    tamano: ""
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    setProducto(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const enviarProducto = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    Object.keys(producto).forEach((key) => {
      formData.append(key, producto[key]);
    });

    const respuesta = await fetch("https://ecommerce-backend-xqxo.onrender.com/productos", {
      method: "POST",
      body: formData
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.log(datos);
      return;
    }

    console.log("Producto guardado:", datos);
  };

  return (
    <form
      className={`form-productos ${desplegar}`}
      onSubmit={enviarProducto}
    >
      <h1 className="titulo-dashboard">Airbell</h1>
      <h2>Agregar producto</h2>

      <div className="grupo-input">
        <label>Nombre</label>
        <input
          type="text"
          name="nombre"
          onChange={handleChange}
          placeholder="Ej: Dior Sauvage"
        />
      </div>

      <div className="fila">
        <div className="grupo-input">
          <label>Marca</label>
          <input
            type="text"
            name="marca"
            onChange={handleChange}
            placeholder="Ej: Dior"
          />
        </div>

        <div className="grupo-input">
          <label>Categoría</label>
          <select
            name="categoria"
            onChange={handleChange}
          >
            <option value="">Seleccionar</option>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>
      </div>

      <div className="fila">
        <div className="grupo-input">
          <label>Precio</label>
          <input
            type="number"
            name="precio"
            onChange={handleChange}
          />
        </div>

        <div className="grupo-input">
          <label>Oferta (%)</label>
          <input
            type="number"
            name="oferta"
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="fila">
        <div className="grupo-input">
          <label>Stock</label>
          <input
            type="number"
            name="stock"
            onChange={handleChange}
          />
        </div>

        <div className="grupo-input">
          <label>SKU</label>
          <input
            type="text"
            name="sku"
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grupo-input">
        <label>Tamaño</label>
        <input
          type="text"
          name="tamano"
          placeholder="50ml, 100ml..."
          onChange={handleChange}
        />
      </div>

      <div className="grupo-input">
        <label>Descripción</label>
        <textarea
          name="descripcion"
          rows="5"
          onChange={handleChange}
        />
      </div>

      <div className="grupo-input">
        <label>Imagen</label>
        <input
          type="file"
          name="imagen"
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        className="btn-guardar"
      >
        Guardar producto
      </button>
    </form>
  );
}


function MostrarProductos({ desplegar }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  
  async function eliminar_producto(id){
    await fetch("https://ecommerce-backend-xqxo.onrender.com/eliminarProductoB",{
      method:"POST",
      headers:{
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id_producto: id
      })
    })
    location.reload()
  }


  useEffect(() => {

    async function obtenerProductos() {
      try {
        const respuesta = await fetch(
          "https://ecommerce-backend-xqxo.onrender.com/mostrarProductosDashboard"
        );

        if (!respuesta.ok) {
          throw new Error("Error al obtener productos");
        }

        const datos = await respuesta.json();

        setProductos(datos);

      } catch (error) {
        setError(error.message);

      } finally {
        setCargando(false);
      }
    }

    obtenerProductos();
  }, []);


  if (cargando) {
    return (
      <div className={`productos ${desplegar}`}>
        <h2>Cargando productos...</h2>
      </div>
    );
  }


  if (error) {
    return (
      <div className={`productos ${desplegar}`}>
        <h2>{error}</h2>
      </div>
    );
  }


  return (
    <main className={`productos ${desplegar}`}>

      <header className="productos-header">
        <h1>AIRBELL</h1>
        <p>Gestión de productos</p>
      </header>


      <section className="mostrar-productos">

        {productos.map((producto) => (

          <article 
            key={producto.id} 
            className="producto-card"
          >

            <div className="producto-imagen">

              <img
                src={
                  producto.imagen
                  ? `https://ecommerce-backend-xqxo.onrender.com/uploads/${producto.imagen}`
                  : "/imagen-default.png"
                }
                alt={producto.nombre}
                className="img-producto"
              />

            </div>



            <div className="producto-info">

              <div className="producto-top">

                <span className="producto-categoria">
                  {producto.categoria}
                </span>


                <span 
                  className={`estado ${
                    producto.estado === "activo"
                    ? "activo"
                    : "inactivo"
                  }`}
                >
                  {producto.estado}
                </span>

              </div>



              <h2>
                {producto.nombre}
              </h2>


              <p className="producto-marca">
                Marca: {producto.marca}
              </p>


              <p className="producto-descripcion">
                {producto.descripcion}
              </p>



              <div className="producto-detalles">

                <span>
                  📦 {producto.stock} unidades
                </span>

                <span>
                  💧 {producto.tamano}
                </span>

              </div>



              <div className="producto-footer">

                <strong className="precio">
                  ${Number(producto.precio).toLocaleString()}
                </strong>


                {producto.oferta > 0 && (

                  <span className="oferta">
                    -{producto.oferta}%
                  </span>

                )}

              </div>



              <div className="acciones">
                <button className="eliminar" onClick={()=> {eliminar_producto(producto.id)}}>
                  Eliminar
                </button>

              </div>


            </div>

          </article>

        ))}

      </section>

    </main>
  );
}



export default Dashboard