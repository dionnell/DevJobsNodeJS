const passport = require('passport');
const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');
const Usuarios = mongoose.model('Usuarios');
const crypto = require('crypto');
const enviarEmail = require('../handlers/email');


exports.autenticarUsuarios = passport.authenticate('local',{
    successRedirect: '/administracion',
    failureRedirect: '/iniciar-sesion',
    failureFlash: true,
    badRequestMessage: 'Ambos campos son obligatorios',

});

//revisar si el usuario esta autenticado o no 
exports.verificarUsuario = (req, res, next ) => {
    //revisar el usuario
    if(req.isAuthenticated()){
        return next(); //usuario autenticado
    }

    //redireccionar si no esta autenticado
    res.redirect('/iniciar-sesion');

}


exports.mostrarPanel = async (req, res ) => {

    //consultar el usuario autenticado
    const vacantes = await Vacante.find({ autor: req.user._id }).lean();
    
    res.render('administracion', {
        nombrePagina: 'Panel de Administracion',
        tagline: 'Crea y Administra tus vacantes',
        cerrarSesion: true,
        nombre : req.user.nombre,
        imagen : req.user.imagen,
        vacantes
    });
}

//cerrar sesion
exports.cerrarSesion = (req, res, next ) => {
    req.logout();
    req.flash('correcto','Cerraste Sesion Correctamente')
    res.redirect('/iniciar-sesion');
}

//reestablecer password
exports.formReestablecerPass = (req, res ) => {
    
    res.render('reestablecer-password', {
        nombrePagina: 'Reestablece tu Password',
        tagline: 'Si ya tienes una cuenta y no recuerdas tu Password, Coloca tu email',
        
    });
}

//genera token en la tabla del usuario
exports.enviarToken = async (req, res ) => {
    const usuario = await Usuarios.findOne({ email: req.body.email });
    
    if(!usuario){
        req.flash('error', 'No existe esta cuenta');
        return res.redirect('/iniciar-sesion');
    }
    //si el usuario existe, generar token
    usuario.token = crypto.randomBytes(20).toString('hex');
    usuario.expira = Date.now() + 3600000;

    //cuardar el Usuario
    await usuario.save();
    const resetUrl = `http://${req.headers.host}/reestablecer-password/${usuario.token}`;

    //console.log(resetUrl);
    //Enviar notificacion por email
    await enviarEmail.enviar({
        usuario,
        subject: 'Reestablece tu Password',
        resetUrl,
        archivo: 'reset'
    });

    //todo correcto
    req.flash('correcto', 'Revisa tu email para seguir las indicaciones');
    res.redirect('/iniciar-sesion');

}

//si el usuario y token es valido, muestra la vista
exports.reestablecerPassword = async(req, res ) => {
    
    const usuario = await Usuarios.findOne({ 
        token: req.params.token,
        expira: {
            $gt: Date.now()
        }
    });

    if(!usuario){
        req.flash('error', 'El formulario no es valido');
        return res.redirect('/reestablecer-password');
    }

    res.render('nuevo-password', {
        nombrePagina: 'Crea un nuevo Password',
        
    });
}


exports.guardarPassword = async(req, res ) => {
    
    const usuario = await Usuarios.findOne({ 
        token: req.params.token,
        expira: {
            $gt: Date.now()
        }
    });

    if(!usuario){
        req.flash('error', 'El formulario no es valido');
        return res.redirect('/reestablecer-password');
    }

    //si todo esta correcto guardar en la BD
    usuario.password = req.body.password;
    usuario.token = undefined;
    usuario.expira = undefined;

    await usuario.save();

    req.flash('correcto', 'Password Modificado Correctamente');
    res.redirect('/iniciar-sesion');


}


