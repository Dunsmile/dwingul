/** The same atomic mutation boundary on local Node SQLite and Cloudflare SQLite. */
export function atomic(db,callback){
 if(typeof db.transactionSync==='function')return db.transactionSync(callback);
 db.exec('BEGIN IMMEDIATE');
 try{const result=callback();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
}
