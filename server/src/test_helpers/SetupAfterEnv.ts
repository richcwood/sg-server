import db from './DB';

module.exports = async () => {
    await db.clearDatabase();
};
