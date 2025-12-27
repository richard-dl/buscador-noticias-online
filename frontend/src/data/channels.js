// Canales de TV organizados por categoría
// Fuente: IPTV con formato TS directo (sin encryption)
// URL base: http://vionixtv.lat:80/live/atyHcyHAVv/Y6HQ8MW2YR/{stream_id}.ts

const IPTV_BASE = 'http://vionixtv.lat:80/live/atyHcyHAVv/Y6HQ8MW2YR';

export const channels = {
  'Argentina - Noticias': [
    {
      id: 'tn-opc1',
      name: 'TN (Todo Noticias)',
      url: `${IPTV_BASE}/573881.ts`,
      logo: 'https://i.postimg.cc/Bvsx0p1w/Sin-t-tulo-8-removebg-preview.png'
    },
    {
      id: 'tn-opc2',
      name: 'TN OPC2',
      url: `${IPTV_BASE}/673708.ts`,
      logo: 'https://i.postimg.cc/Bvsx0p1w/Sin-t-tulo-8-removebg-preview.png'
    },
    {
      id: 'c5n-opc1',
      name: 'C5N',
      url: `${IPTV_BASE}/573905.ts`,
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjapW9LNwBHOTAAe689A_mFZ7jT9p6UaINPQ&s'
    },
    {
      id: 'c5n-opc2',
      name: 'C5N OPC2',
      url: `${IPTV_BASE}/573906.ts`,
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjapW9LNwBHOTAAe689A_mFZ7jT9p6UaINPQ&s'
    },
    {
      id: 'cronica',
      name: 'Crónica TV',
      url: `${IPTV_BASE}/573917.ts`,
      logo: 'https://i.ibb.co/Z1yCkFY/cronica.png'
    },
    {
      id: 'a24-opc1',
      name: 'A24',
      url: `${IPTV_BASE}/573899.ts`,
      logo: 'http://www.tmsimg.com/assets/s16272_ll_h3_ab.png'
    },
    {
      id: 'canal26-opc1',
      name: 'Canal 26',
      url: `${IPTV_BASE}/573884.ts`,
      logo: 'https://pbs.twimg.com/profile_images/1242114940/LogoCanal26_400x400.jpg'
    },
    {
      id: 'canal26-opc2',
      name: 'Canal 26 OPC2',
      url: `${IPTV_BASE}/573885.ts`,
      logo: 'https://pbs.twimg.com/profile_images/1242114940/LogoCanal26_400x400.jpg'
    },
    {
      id: 'lanacion-opc1',
      name: 'LN+ (La Nación)',
      url: `${IPTV_BASE}/573927.ts`,
      logo: 'https://carbisis.com.ar/wp-content/uploads/2022/06/La-Nacion-Mas-Logo-1.png'
    },
    {
      id: 'lanacion-opc2',
      name: 'LN+ OPC2',
      url: `${IPTV_BASE}/573928.ts`,
      logo: 'https://carbisis.com.ar/wp-content/uploads/2022/06/La-Nacion-Mas-Logo-1.png'
    }
  ],
  'Argentina - Canales': [
    {
      id: 'telefe-opc1',
      name: 'Telefe',
      url: `${IPTV_BASE}/660509.ts`,
      logo: 'https://i.ibb.co/GW7gN3g/telefe.png'
    },
    {
      id: 'telefe-opc2',
      name: 'Telefe OPC2',
      url: `${IPTV_BASE}/573941.ts`,
      logo: 'https://i.ibb.co/GW7gN3g/telefe.png'
    },
    {
      id: 'eltrece-opc1',
      name: 'El Trece',
      url: `${IPTV_BASE}/573922.ts`,
      logo: 'https://i.ibb.co/qM8Q3qk/el-trece.png'
    },
    {
      id: 'eltrece-opc2',
      name: 'El Trece OPC2',
      url: `${IPTV_BASE}/573923.ts`,
      logo: 'https://i.ibb.co/qM8Q3qk/el-trece.png'
    },
    {
      id: 'america-opc1',
      name: 'América',
      url: `${IPTV_BASE}/573902.ts`,
      logo: 'https://static.wikia.nocookie.net/logopedia/images/9/99/Am%C3%A9rica_Canal_2_2005.svg/revision/latest/scale-to-width-down/225?cb=20230314194109&path-prefix=es'
    },
    {
      id: 'america-opc2',
      name: 'América OPC2',
      url: `${IPTV_BASE}/573903.ts`,
      logo: 'https://static.wikia.nocookie.net/logopedia/images/9/99/Am%C3%A9rica_Canal_2_2005.svg/revision/latest/scale-to-width-down/225?cb=20230314194109&path-prefix=es'
    }
  ]
};

// Función para obtener todas las categorías
export const getCategories = () => Object.keys(channels);

// Función para buscar canales por nombre
export const searchChannels = (query) => {
  const results = [];
  const searchTerm = query.toLowerCase();

  Object.entries(channels).forEach(([category, channelList]) => {
    channelList.forEach(channel => {
      if (channel.name.toLowerCase().includes(searchTerm)) {
        results.push({ ...channel, category });
      }
    });
  });

  return results;
};

// Función para obtener un canal por ID
export const getChannelById = (id) => {
  for (const [category, channelList] of Object.entries(channels)) {
    const channel = channelList.find(c => c.id === id);
    if (channel) {
      return { ...channel, category };
    }
  }
  return null;
};
