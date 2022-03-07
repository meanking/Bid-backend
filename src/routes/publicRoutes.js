import express from 'express';
import { web3Controller } from '../controllers';

const publicRoutes = express.Router();

publicRoutes.get('/info/:address', web3Controller().getUserBidInfo);

publicRoutes.post('/delegateBid', web3Controller().delegateBid);

export { publicRoutes };
