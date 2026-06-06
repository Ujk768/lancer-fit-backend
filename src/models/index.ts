import { sequelize } from '../config/database';
import { User } from './User';
import { Post } from './Post';

sequelize.sync({ force: false }); // optional in dev

export { User, Post };