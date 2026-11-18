const { init } = require('./database');

(async () => {
  console.log('🚀 Inicializando base de datos de MatchPoint...');
  await init();
  console.log('✅ Base de datos lista.');
})().catch(err => {
  console.error('❌ Error al inicializar la base de datos:', err);
  process.exit(1);
});
