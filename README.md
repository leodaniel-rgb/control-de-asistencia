# Gestión de Asistencia (Web)

Opciones para acceder a la cámara desde móviles sin instalar nada en los dispositivos:

1) Desplegar en un host HTTPS (recomendado): Vercel / Netlify / GitHub Pages.
   - Al publicar en HTTPS, los navegadores móviles permitirán `getUserMedia` y la cámara funcionará desde la web.

2) GitHub Pages (sin instalar nada en el móvil):
   - Paso corto: crea un repo en GitHub, sube este proyecto (push), y la GitHub Action `build-and-deploy` se encargará de compilar y publicar en Pages.
   - La URL publicada será HTTPS (p. ej. `https://<usuario>.github.io/<repo>`). Abre esa URL en el móvil.

3) Vercel/Netlify: conectar tu repo y desplegar (interfaz web, sin instalación en el móvil).

Cómo usar la Action de GitHub Pages incluida:
- Sube el proyecto a un repositorio público o privado en GitHub.
- Haz push a `main` o `master`.
- En el repo, en "Actions" verás el workflow "Build and deploy to GitHub Pages" ejecutar.
- Tras finalizar, ve a `Settings -> Pages` para ver la URL pública o revisa la salida del Action que la indicará.

Requisitos y notas:
- El móvil no necesita instalar nada.
- La app debe abrirse por HTTPS para que Chrome/Edge en Android y Safari en iOS permitan la cámara.
- Si quieres que te ayude a publicar (hacer el push y configurar el repo), dime y puedo crear los archivos y guiarte en el push.

Comandos locales útiles:
```
# levantar dev server
npm run dev -- --host --port 5173

# build
npm run build

# preview de la build (local)
npm run preview
```
