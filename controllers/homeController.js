const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');


exports.mostrarTrabajos = async (req, res, next ) => {

    //traer las vacantes
    const vacantes = await Vacante.find({}).lean();

    if(!vacantes) return next();

    res.render('home', {
        nombrePagina: 'DevJobs',
        tagline: 'Encuentra y publica trabajos',
        barra: true,
        boton: true,
        vacantes : vacantes
    });
}