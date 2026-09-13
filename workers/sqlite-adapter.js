export function durableSqlite(storage){
 const sql=storage.sql;
 return {
  exec(statement){const cleaned=statement.replace(/PRAGMA\s+journal_mode\s*=\s*WAL\s*;?/ig,'');if(cleaned.trim())sql.exec(cleaned).toArray();},
  prepare(statement){return {
   all(...args){return sql.exec(statement,...args).toArray();},
   get(...args){return sql.exec(statement,...args).toArray()[0];},
   run(...args){sql.exec(statement,...args).toArray();return {changes:sql.exec('SELECT changes() AS n').one().n};}
  };},
  transactionSync:callback=>storage.transactionSync(callback),
 };
}
