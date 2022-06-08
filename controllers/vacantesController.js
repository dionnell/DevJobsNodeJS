const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');
const multer = require('multer');
const shortid = require('shortid');

//const Vacante = require('../models/Vacantes');


exports.formularioNuevaVacante = (req, res ) => {

    res.render('nueva-vacante', {
        nombrePagina: 'Nueva Vacante',
        tagline: 'LLena el formulario y publica nueva vacante',
        cerrarSesion: true,
        nombre : req.user.nombre,
        imagen : req.user.imagen
    });
}

exports.agregarVacante = async(req, res ) => {

    const vacante = new Vacante(req.body);

    //usuario autor de vacante
    vacante.autor = req.user._id

    //crear arreglo de skills
    vacante.skills = req.body.skills.split(',');

    //almacenar en la BD
    const nuevaVacante = await vacante.save();

    //redireccionar
    res.redirect(`/vacantes/${nuevaVacante.url}`);

}

//mostrar una vacante
exports.mostrarVacante = async(req, res, next ) => {

    const vacante = await Vacante.findOne({ url : req.params.url }).populate('autor').lean();
    //console.log(vacante);
    //si no hay resultado
    if(!vacante) return next();


    res.render('vacante', {
        vacante,
        nombrePagina: vacante.titulo ,
        barra: true
        
    });
}


exports.formEditarVacante = async(req, res, next ) => {

    const vacante = await Vacante.findOne({ url : req.params.url }).lean();

    //si no hay resultado
    if(!vacante) return next();


    res.render('editar-vacante', {
        vacante,
        nombrePagina: `Editar - ${vacante.titulo} ` ,
        cerrarSesion: true,
        nombre : req.user.nombre,
        imagen : req.user.imagen
        
    });

}

exports.editarVacante = async(req, res ) => {

    const vacanteActualizada = req.body;

    //crear arreglo de skills
    vacanteActualizada.skills = req.body.skills.split(',');

    //almacenar en la BD
    const vacante = await Vacante.findOneAndUpdate({ url : req.params.url }, vacanteActualizada, {
        new: true,
        runValidators: true
    }).lean();

    //redireccionar
    res.redirect(`/vacantes/${vacante.url}`);

}

//validar y sanitizar las vacantes
exports.validarVacante = (req, res, next ) => {

    //sanitizar los datos
    req.sanitizeBody('titulo').escape();
    req.sanitizeBody('empresa').escape();
    req.sanitizeBody('ubicacion').escape();
    req.sanitizeBody('salario').escape();
    req.sanitizeBody('contrato').escape();
    req.sanitizeBody('skills').escape();

    //validar

    req.checkBody('titulo', 'El titulo es Obligatorio').notEmpty();
    req.checkBody('empresa', 'La Empresa es Obligatorio').notEmpty();
    req.checkBody('ubicacion', 'La Ubicacion no puede ir vacio').notEmpty();
    req.checkBody('contrato', 'Selecciona el tipo de Contrato').notEmpty();
    req.checkBody('skills', 'agrega al menos 1 skill').notEmpty();



    const errores = req.validationErrors();
    
    if(errores){
        //si hay errores
        req.flash('error', errores.map(error => error.msg));

        res.render ('nueva-vacante',{
            nombrePagina: 'Nueva Vacante',
            tagline: 'LLena el formulario y publica nueva vacante',
            cerrarSesion: true,
            nombre : req.user.nombre,
            imagen : req.user.imagen,
            mensajes: req.flash()
        });
        return;

    }
    //si toda la volidadion es correcta
    next();

}

//eliminar vacante
exports.eliminarVacante = async(req, res ) => {
    const { id } = req.params;

    const vacante = await Vacante.findById(id);
    if(verificarAutor(vacante, req.user)){
        //si es el usuario, eliminar vacante
        vacante.remove();
        res.status(200).send('Vacante eliminada');
    }else{
        //no permitido
        res.status(403).send('Error');
    }

   
}

const verificarAutor = (vacante={}, usuario={}) =>{
    if(!vacante.autor.equals(usuario._id)){
        return false;
    }else{
        return true;
    }

}

//Subir archivos en pdf
exports.subirCV = async(req, res, next ) => {
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
            res.redirect('back');
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
            cb(null, __dirname+'../../public/uploads/cv');
        },
        filename: (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null, `${shortid.generate()}.${extension}`);
        },
    }),
    fileFilter(req, file, cb){
        if(file.mimetype === 'application/pdf' ){
            //el cb(callback) se ejecuta como true o false: true cuando la imagen se acepta
            cb(null,true); 
        }else{
            cb(new Error('Formato no Valido'), false);
        }
    }
    

}
const upload = multer(configuracionMulter).single('cv');

//almacenar los candidatos en la BD
exports.contactar = async(req, res, next) =>{
    const vacante = await Vacante.findOne({ url : req.params.url });

    //si no existe la vacante
    if(!vacante){
        return next();
    }

    //si esta todo bien, construir el nuevo objeto 
    const nuevoCandidato = {
        nombre: req.body.nombre,
        email: req.body.email,
        cv: req.file.filename
    }

    //almacenar la Vacante
    vacante.candidatos.push(nuevoCandidato);
    await vacante.save();

    //mensaje Flash y redireccion
    req.flash('correcto', 'Se envio tu CV correctamente');
    res.redirect('/');

}

//Mostrar Candidatos
exports.mostrarCandidatos = async(req, res, next ) => {

    const vacante = await Vacante.findById(req.params.id);
    
    if(vacante.autor != req.user._id.toString()){
        return next();
    }
    if(!vacante){
        return next();
    }
    const vacantes = await Vacante.findById(req.params.id).lean();
    //console.log(vacantes.candidatos);
    res.render('candidatos', {
        nombrePagina: `Candidatos Vacante - ${vacantes.titulo} ` ,
        cerrarSesion: true,
        nombre : req.user.nombre,
        imagen : req.user.imagen,
        candidatos : vacantes.candidatos
        
    });

}

//buscador de vacantes

exports.buscarVacantes = async(req, res ) => {

    const vacante = await Vacante.find({
        $text: {
            $search: req.body.q
        }
    });

    const vacantes = await Vacante.find({
        $text: {
            $search: req.body.q
        }
    }).lean();

    //mostrar las vacantes
    res.render('Home', {
        nombrePagina: `Resultados de la busqueda: ${req.body.q} ` ,
        barra: true,
        vacantes
        
    });


}