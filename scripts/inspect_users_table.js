const pool = require('../config/db');

(async ()=>{
  try{
    console.log('Describe users table columns:');
    const cols = await pool.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
    console.table(cols.rows);

    console.log('\nCheck constraints for users table:');
    const cons = await pool.query(`SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.contype = 'c'`);
    console.table(cons.rows);

    console.log('\nEnumerated role values (if check uses IN):');
    for (const row of cons.rows) {
      if (row.def && row.def.includes('role')) console.log(row.def);
    }
  }catch(e){
    console.error('err', e && e.message ? e.message : e);
  }finally{ process.exit(0); }
})();
