(function () {
  "use strict";

  var STORAGE_KEY = "sobre-secreto-config-v1";

  // ---- Almacenamiento local (por navegador) ----
  function leerConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var config = JSON.parse(raw);
      // Compatibilidad con versiones anteriores que guardaban una sola foto
      if (config && !config.fotos && config.foto) {
        config.fotos = [config.foto];
      }
      if (config && !Array.isArray(config.fotos)) {
        config.fotos = [];
      }
      return config;
    } catch (e) {
      console.error("No se pudo leer la configuración guardada:", e);
      return null;
    }
  }

  function guardarConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (e) {
      console.error("No se pudo guardar la configuración:", e);
      return false;
    }
  }

  function borrarConfig() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("No se pudo borrar la configuración:", e);
    }
  }

  // ---- Elementos ----
  var sobre = document.getElementById("sobre");
  var solapa = document.getElementById("solapa");
  var carta = document.getElementById("carta");
  var fotoCarta = document.getElementById("fotoCarta");
  var instruccion = document.getElementById("instruccion");
  var sobreWrap = document.getElementById("sobreWrap");
  var btnCerrarCarta = document.getElementById("btnCerrarCarta");
  var tituloPrincipal = document.getElementById("tituloPrincipal");
  var subtitulo = document.getElementById("subtitulo");

  var overlayLectura = document.getElementById("overlayLectura");
  var fotoGrande = document.getElementById("fotoGrande");
  var btnCerrarLectura = document.getElementById("btnCerrarLectura");
  var btnPaginaAnterior = document.getElementById("btnPaginaAnterior");
  var btnPaginaSiguiente = document.getElementById("btnPaginaSiguiente");
  var pistaLectura = document.getElementById("pistaLectura");
  var badgePaginas = document.getElementById("badgePaginas");

  var overlayAbrir = document.getElementById("overlayAbrir");
  var inputPasswordAbrir = document.getElementById("inputPasswordAbrir");
  var errorAbrir = document.getElementById("errorAbrir");
  var panelAbrir = document.getElementById("panelAbrir");

  var overlayConfig = document.getElementById("overlayConfig");
  var panelConfig = document.getElementById("panelConfig");
  var pasoVerificar = document.getElementById("pasoVerificar");
  var formConfig = document.getElementById("formConfig");
  var inputPasswordActual = document.getElementById("inputPasswordActual");
  var errorVerificar = document.getElementById("errorVerificar");
  var zonaSubirFoto = document.getElementById("zonaSubirFoto");
  var inputFoto = document.getElementById("inputFoto");
  var miniaturas = document.getElementById("miniaturas");
  var inputTitulo = document.getElementById("inputTitulo");
  var inputPasswordNueva = document.getElementById("inputPasswordNueva");
  var inputPasswordConfirmar = document.getElementById("inputPasswordConfirmar");
  var errorConfig = document.getElementById("errorConfig");
  var tituloConfig = document.getElementById("tituloConfig");
  var ayudaConfig = document.getElementById("ayudaConfig");

  var fotosPendientes = [];   // dataURLs elegidas en el formulario, aún no guardadas
  var fotosActuales = [];     // páginas del sobre ya abierto/guardado
  var fotosLightbox = [];     // páginas mostradas en el visor grande
  var indiceActual = 0;       // página actual dentro del visor grande

  // ---- Vista inicial según si ya hay un sobre configurado ----
  function actualizarVistaInicial() {
    var config = leerConfig();
    if (config) {
      if (config.titulo) {
        tituloPrincipal.textContent = config.titulo;
        document.title = config.titulo;
      }
      instruccion.textContent = "Toca el sobre para intentar abrirlo";
      subtitulo.textContent = "Toca el sobre para intentar abrirlo";
    } else {
      instruccion.textContent = "Aún no has creado tu sobre. Toca el engranaje ⚙ para empezar.";
      subtitulo.textContent = "Configura tu sobre para comenzar";
    }
  }
  actualizarVistaInicial();

  // ---- Abrir el sobre (clic o teclado) ----
  function intentarAbrirSobre() {
    var config = leerConfig();
    if (!config) {
      abrirConfig();
      return;
    }
    if (sobre.classList.contains("abierto")) return;
    errorAbrir.textContent = "";
    inputPasswordAbrir.value = "";
    overlayAbrir.classList.add("visible");
    setTimeout(function () { inputPasswordAbrir.focus(); }, 50);
  }

  sobre.addEventListener("click", intentarAbrirSobre);
  sobre.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      intentarAbrirSobre();
    }
  });

  document.getElementById("btnCancelarAbrir").addEventListener("click", function () {
    overlayAbrir.classList.remove("visible");
  });

  function actualizarControlesNav() {
    var varias = fotosLightbox.length > 1;
    btnPaginaAnterior.classList.toggle("oculto", !varias);
    btnPaginaSiguiente.classList.toggle("oculto", !varias);
    btnPaginaAnterior.disabled = indiceActual <= 0;
    btnPaginaSiguiente.disabled = indiceActual >= fotosLightbox.length - 1;
    pistaLectura.textContent = varias
      ? "Página " + (indiceActual + 1) + " de " + fotosLightbox.length + " · Toca la imagen o la ✕ para cerrar"
      : "Toca la imagen o la ✕ para cerrar";
  }

  function irAPagina(nuevoIndice) {
    if (nuevoIndice < 0 || nuevoIndice >= fotosLightbox.length || nuevoIndice === indiceActual) return;
    var direccion = nuevoIndice > indiceActual ? 1 : -1;
    indiceActual = nuevoIndice;
    var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducirMovimiento) {
      fotoGrande.src = fotosLightbox[indiceActual];
      actualizarControlesNav();
      return;
    }

    fotoGrande.style.transition = "transform 0.28s ease, opacity 0.28s ease";
    fotoGrande.style.opacity = "0";
    fotoGrande.style.transform = "translateX(" + (direccion * -22) + "px)";
    setTimeout(function () {
      fotoGrande.src = fotosLightbox[indiceActual];
      fotoGrande.style.transition = "none";
      fotoGrande.style.transform = "translateX(" + (direccion * 22) + "px)";
      void fotoGrande.offsetWidth;
      requestAnimationFrame(function () {
        fotoGrande.style.transition = "transform 0.32s ease, opacity 0.32s ease";
        fotoGrande.style.transform = "translateX(0)";
        fotoGrande.style.opacity = "1";
      });
      actualizarControlesNav();
    }, 220);
  }

  btnPaginaAnterior.addEventListener("click", function () { irAPagina(indiceActual - 1); });
  btnPaginaSiguiente.addEventListener("click", function () { irAPagina(indiceActual + 1); });

  document.addEventListener("keydown", function (e) {
    if (!overlayLectura.classList.contains("visible")) return;
    if (e.key === "ArrowRight") irAPagina(indiceActual + 1);
    if (e.key === "ArrowLeft") irAPagina(indiceActual - 1);
  });

  // Deslizar con el dedo para cambiar de página en móvil
  var toqueInicioX = null;
  var lecturaMarco = document.querySelector(".lectura-marco");
  lecturaMarco.addEventListener("touchstart", function (e) {
    toqueInicioX = e.changedTouches[0].clientX;
  }, { passive: true });
  lecturaMarco.addEventListener("touchend", function (e) {
    if (toqueInicioX === null) return;
    var deltaX = e.changedTouches[0].clientX - toqueInicioX;
    toqueInicioX = null;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) irAPagina(indiceActual + 1);
    else irAPagina(indiceActual - 1);
  }, { passive: true });

  function abrirLectura(fotos, indiceInicial, sourceEl) {
    fotosLightbox = fotos || [];
    indiceActual = indiceInicial || 0;
    if (!fotosLightbox.length) return;
    fotoGrande.src = fotosLightbox[indiceActual];
    actualizarControlesNav();
    overlayLectura.classList.add("visible");

    var animar = function () {
      var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!sourceEl || reducirMovimiento) {
        requestAnimationFrame(function () {
          overlayLectura.classList.add("mostrado");
        });
        return;
      }

      var startRect = sourceEl.getBoundingClientRect();
      if (startRect.width < 2 || startRect.height < 2) {
        requestAnimationFrame(function () {
          overlayLectura.classList.add("mostrado");
        });
        return;
      }

      overlayLectura.classList.add("mostrado");

      // Técnica FLIP: medimos la posición final y "engañamos" al elemento
      // para que empiece visualmente en la posición/tamaño de origen.
      requestAnimationFrame(function () {
        var endRect = fotoGrande.getBoundingClientRect();
        var dx = (startRect.left + startRect.width / 2) - (endRect.left + endRect.width / 2);
        var dy = (startRect.top + startRect.height / 2) - (endRect.top + endRect.height / 2);
        var escalaX = startRect.width / endRect.width;
        var escalaY = startRect.height / endRect.height;

        fotoGrande.style.transition = "none";
        fotoGrande.style.transformOrigin = "center center";
        fotoGrande.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + escalaX + "," + escalaY + ")";
        fotoGrande.style.opacity = "0.85";

        // Forzar reflow antes de animar a la posición final
        void fotoGrande.offsetWidth;

        requestAnimationFrame(function () {
          fotoGrande.style.transition = "transform 0.85s cubic-bezier(.22,.85,.32,1), opacity 0.5s ease";
          fotoGrande.style.transform = "translate(0,0) scale(1,1)";
          fotoGrande.style.opacity = "1";
        });
      });
    };

    if (fotoGrande.complete && fotoGrande.naturalWidth > 0) {
      animar();
    } else {
      fotoGrande.onload = animar;
    }
  }

  function cerrarLectura() {
    overlayLectura.classList.remove("mostrado");
    fotoGrande.style.transition = "";
    fotoGrande.style.transform = "";
    fotoGrande.style.opacity = "";
    setTimeout(function () {
      overlayLectura.classList.remove("visible");
    }, 350);
  }
  btnCerrarLectura.addEventListener("click", cerrarLectura);
  overlayLectura.addEventListener("click", function (e) {
    if (e.target === overlayLectura || e.target === fotoGrande) cerrarLectura();
  });
  fotoCarta.addEventListener("click", function () {
    if (fotosActuales.length) abrirLectura(fotosActuales, 0, fotoCarta);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlayLectura.classList.contains("visible")) cerrarLectura();
  });

  function confirmarAbrir() {
    var config = leerConfig();
    if (!config) return;
    if (inputPasswordAbrir.value === config.password) {
      overlayAbrir.classList.remove("visible");
      fotosActuales = config.fotos || [];
      fotoCarta.src = fotosActuales[0] || "";
      if (fotosActuales.length > 1) {
        badgePaginas.textContent = fotosActuales.length + " páginas";
        badgePaginas.classList.add("visible");
      } else {
        badgePaginas.classList.remove("visible");
      }
      sobre.classList.add("abierto");
      instruccion.textContent = "";
      sobreWrap.classList.add("mostrando-acciones");
      // Mostrar la carta en grande automáticamente, con un crecimiento natural
      setTimeout(function () { abrirLectura(fotosActuales, 0, fotoCarta); }, 950);
    } else {
      errorAbrir.textContent = "Contraseña incorrecta. Intenta de nuevo.";
      panelAbrir.classList.remove("shake");
      void panelAbrir.offsetWidth;
      panelAbrir.classList.add("shake");
    }
  }

  document.getElementById("btnConfirmarAbrir").addEventListener("click", confirmarAbrir);
  inputPasswordAbrir.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); confirmarAbrir(); }
  });

  document.getElementById("btnVerGrande").addEventListener("click", function () {
    if (fotosActuales.length) abrirLectura(fotosActuales, 0, fotoCarta);
  });

  btnCerrarCarta.addEventListener("click", function () {
    sobre.classList.remove("abierto");
    sobreWrap.classList.remove("mostrando-acciones");
    instruccion.textContent = "Toca el sobre para intentar abrirlo";
  });

  // ---- Configuración (crear / editar) ----
  document.getElementById("btnConfig").addEventListener("click", abrirConfig);

  function abrirConfig() {
    var config = leerConfig();
    errorVerificar.textContent = "";
    inputPasswordActual.value = "";
    if (config) {
      tituloConfig.textContent = "Editar sobre";
      ayudaConfig.textContent = "Ingresa la contraseña actual para hacer cambios.";
      pasoVerificar.style.display = "block";
      formConfig.style.display = "none";
    } else {
      tituloConfig.textContent = "Crea tu sobre";
      ayudaConfig.textContent = "Sube la foto de la carta y define una contraseña para protegerla.";
      pasoVerificar.style.display = "none";
      mostrarFormularioConfig(null);
    }
    overlayConfig.classList.add("visible");
    setTimeout(function () {
      if (config) inputPasswordActual.focus();
    }, 50);
  }

  document.getElementById("btnCancelarVerificar").addEventListener("click", function () {
    overlayConfig.classList.remove("visible");
  });
  document.getElementById("btnCancelarConfig").addEventListener("click", function () {
    overlayConfig.classList.remove("visible");
  });

  document.getElementById("btnConfirmarVerificar").addEventListener("click", function () {
    var config = leerConfig();
    if (config && inputPasswordActual.value === config.password) {
      mostrarFormularioConfig(config);
    } else {
      errorVerificar.textContent = "Contraseña incorrecta.";
    }
  });
  inputPasswordActual.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnConfirmarVerificar").click();
    }
  });

  document.getElementById("btnReiniciarTodo").addEventListener("click", function () {
    var config = leerConfig();
    if (config && inputPasswordActual.value !== config.password) {
      errorVerificar.textContent = "Escribe la contraseña actual para poder borrar el sobre.";
      return;
    }
    if (window.confirm("Esto borrará la foto y la contraseña guardadas en este navegador. ¿Continuar?")) {
      borrarConfig();
      overlayConfig.classList.remove("visible");
      sobre.classList.remove("abierto");
      sobreWrap.classList.remove("mostrando-acciones");
      fotoCarta.src = "";
      fotosActuales = [];
      badgePaginas.classList.remove("visible");
      tituloPrincipal.textContent = "Un sobre para ti";
      document.title = "Un sobre para ti";
      actualizarVistaInicial();
    }
  });

  function renderizarMiniaturas() {
    miniaturas.innerHTML = "";
    fotosPendientes.forEach(function (src, idx) {
      var mini = document.createElement("div");
      mini.className = "miniatura";

      var img = document.createElement("img");
      img.src = src;
      img.alt = "Página " + (idx + 1);

      var numero = document.createElement("span");
      numero.className = "numero";
      numero.textContent = idx + 1;

      var quitar = document.createElement("button");
      quitar.type = "button";
      quitar.className = "quitar";
      quitar.setAttribute("aria-label", "Quitar esta página");
      quitar.textContent = "✕";
      quitar.addEventListener("click", function () {
        fotosPendientes.splice(idx, 1);
        renderizarMiniaturas();
      });

      mini.appendChild(img);
      mini.appendChild(numero);
      mini.appendChild(quitar);
      miniaturas.appendChild(mini);
    });
  }

  function mostrarFormularioConfig(configExistente) {
    pasoVerificar.style.display = "none";
    formConfig.style.display = "block";
    errorConfig.textContent = "";
    inputPasswordNueva.value = "";
    inputPasswordConfirmar.value = "";
    fotosPendientes = configExistente && configExistente.fotos ? configExistente.fotos.slice() : [];
    inputTitulo.value = configExistente && configExistente.titulo ? configExistente.titulo : "";
    renderizarMiniaturas();
    setTimeout(function () { inputTitulo.focus(); }, 50);
  }

  function leerArchivoComoDataURL(archivo) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      lector.onload = function (e) { resolve(e.target.result); };
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  inputFoto.addEventListener("change", function () {
    var archivos = Array.prototype.slice.call(inputFoto.files || []);
    if (!archivos.length) return;
    errorConfig.textContent = "";
    Promise.all(archivos.map(leerArchivoComoDataURL))
      .then(function (resultados) {
        fotosPendientes = fotosPendientes.concat(resultados);
        renderizarMiniaturas();
        inputFoto.value = "";
      })
      .catch(function () {
        errorConfig.textContent = "No se pudieron leer algunas imágenes. Intenta de nuevo.";
      });
  });

  formConfig.addEventListener("submit", function (e) {
    e.preventDefault();
    errorConfig.textContent = "";

    var configExistente = leerConfig();

    if (!fotosPendientes.length) {
      errorConfig.textContent = "Sube al menos una foto de la carta.";
      return;
    }

    var nuevaPass = inputPasswordNueva.value;
    var confirmarPass = inputPasswordConfirmar.value;

    if (!configExistente && !nuevaPass) {
      errorConfig.textContent = "Define una contraseña para proteger la carta.";
      return;
    }
    if (nuevaPass || confirmarPass) {
      if (nuevaPass !== confirmarPass) {
        errorConfig.textContent = "Las contraseñas no coinciden.";
        return;
      }
    }

    var passwordFinal = nuevaPass ? nuevaPass : (configExistente ? configExistente.password : "");

    var nuevaConfig = {
      fotos: fotosPendientes.slice(),
      password: passwordFinal,
      titulo: inputTitulo.value.trim()
    };

    if (!guardarConfig(nuevaConfig)) {
      errorConfig.textContent = "No se pudo guardar. Puede que las imágenes pesen demasiado; intenta con menos fotos o más livianas.";
      return;
    }

    overlayConfig.classList.remove("visible");
    sobre.classList.remove("abierto");
    sobreWrap.classList.remove("mostrando-acciones");
    fotoCarta.src = "";
    fotosActuales = [];
    badgePaginas.classList.remove("visible");
    actualizarVistaInicial();
  });

  // Cerrar overlays al hacer clic fuera del panel
  [overlayAbrir, overlayConfig].forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.classList.remove("visible");
    });
  });

})();