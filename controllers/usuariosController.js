const mongoose = require('mongoose');
const multer = require('multer');
const Usuarios = mongoose.model('Usuarios');
//const multer = require('multer');
const shortid = require('shortid');


exports.subirImagen = async(req, res, next ) => {
    upload(req, res, function(error)  {
        if(error){
            //console.log(error);
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error', 'El archivo es muy grande. Max 100Kb');
                }else{
                    req.flash('error', error.message);
                }
            }else{
                req.flash('error', error.message);
            }
            res.redirect('/administracion');
            return;
        }else{

            return next();
        }

    });

}
//configurarion de multer
const configuracionMulter = {
    limits : { fileSize: 100000},
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, __dirname+'../../public/uploads/perfiles');
        },
        filename: (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null, `${shortid.generate()}.${extension}`);
        },
    }),
    fileFilter(req, file, cb){
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
            //el cb(callback) se ejecuta como true o false: true cuando la imagen se acepta
            cb(null,true); 
        }else{
            cb(new Error('Formato no Valido'), false);
        }
    }
    

}
const upload = multer(configuracionMulter).single('imagen');


exports.formCrearCuenta = (req, res ) => {

    res.render('crear-cuenta', {
        nombrePagina: 'Crear Cuenta DevJobs',
        tagline: 'LLena el formulario y crea tu nueva cuenta',
        
    });
}




exports.validarRegistro = (req, res, next ) => {

    //sanitizar los datos
    req.sanitizeBody('nombre').escape();
    req.sanitizeBody('email').escape();
    req.sanitizeBody('password').escape();
    req.sanitizeBody('confirmar').escape();

    //validar

    req.checkBody('nombre', 'El nombre es Obligatorio').notEmpty();
    req.checkBody('email', 'El email debe ser valido').isEmail();
    req.checkBody('password', 'El password no puede ir vacio').notEmpty();
    req.checkBody('confirmar', 'Confirmar password no puede ir vacio').notEmpty();
    req.checkBody('confirmar', 'El password es diferente').equals(req.body.password);

    const errores = req.validationErrors();
    
    if(errores){
        //si hay errores
        req.flash('error', errores.map(error => error.msg));

        res.render ('crear-cuenta',{
            nombrePagina: 'Crear Cuenta DevJobs',
            tagline: 'LLena el formulario y crea tu nueva cuenta',
            mensajes: req.flash()
        });
        return;

    }
    //si toda la volidadion es correcta
    next();

}

exports.crearUsuario = async(req, res, next) => {

    //crear el usuario
    const usuario = new Usuarios(req.body);

    try {
        await usuario.save();
        //redireccionar
        res.redirect('/iniciar-sesion');
    } catch (error) {
        req.flash('error', error);
        //redireccionar
        res.redirect('/crear-cuenta');
    }

}

exports.formIniciarSesion = (req, res ) => {

    res.render('iniciar-sesion', {
        nombrePagina: 'Iniciar Sesion DevJobs',
        
    });
}

//form editar perfil
exports.formEditarPerfil = async(req, res ) => {
    const usuario = await Usuarios.findById(req.user._id).lean();
    res.render('editar-perfil', {
        nombrePagina: 'Editar Perfil DevJobs',
        cerrarSesion: true,
        nombre : req.user.nombre,
        imagen : req.user.imagen,
        usuario
    });
}

//Guardar cambios del perfil
exports.editarPerfil = async(req, res ) => {
    const usuario = await Usuarios.findById(req.user._id);

    usuario.nombre = req.body.nombre;
    usuario.email = req.body.email;
    if(req.body.password){
        usuario.password = req.body.password;
    }

    if(req.file){
        usuario.imagen = req.file.filename;
    }
    //console.log(usuario.imagen);
    await usuario.save();
    req.flash('correcto','Cambios Guardados Correctamente');
    //redirect
    res.redirect('/administracion');
    //console.log(usuario);
}

//sanitizar y validar el formulario dew editar perfil
exports.validarPerfil = async(req, res, next ) => {

    //sanitizar los datos
    req.sanitizeBody('nombre').escape();
    req.sanitizeBody('email').escape();
    if(req.body.password){
        req.sanitizeBody('password').escape();
    }

    //validar

    req.checkBody('nombre', 'El nombre es Obligatorio').notEmpty();
    req.checkBody('email', 'El email debe ser valido').isEmail();

    const errores = req.validationErrors();
    
    if(errores){
        //si hay errores
        req.flash('error', errores.map(error => error.msg));
        const usuario = await Usuarios.findById(req.user._id).lean();

        res.render ('editar-perfil',{
            nombrePagina: 'Editar Perfil DevJobs',
            cerrarSesion: true,
            nombre : req.user.nombre,
            imagen : req.user.imagen,
            usuario,
            mensajes: req.flash()
        });
        return;

    }
    //si toda la volidadion es correcta
    next();

}

