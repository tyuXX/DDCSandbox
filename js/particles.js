const PARTICLE_PROPERTIES = {
    sand: {
        color: '#e3c078',
        gravity: true,
        movable: true,
        name: 'Sand'
    },
    water: {
        color: '#4287f5',
        gravity: true,
        movable: true,
        liquid: true,
        name: 'Water'
    },
    wall: {
        color: '#666666',
        gravity: false,
        movable: false,
        name: 'Wall'
    },
    tnt: {
        color: '#ff0000',
        gravity: true,
        movable: true,
        explosive: true,
        name: 'TNT'
    },
    co2: {
        color: '#a0a0a0',
        gravity: false,
        movable: true,
        gas: true,
        name: 'Carbon Dioxide'
    },
    empty: {
        color: '#000000',
        name: 'Empty'
    }
};