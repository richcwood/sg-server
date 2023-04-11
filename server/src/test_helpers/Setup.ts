import * as dotenv from 'dotenv';
dotenv.config();
import db from './DB';

module.exports = async () => {
    await db.open();
};
