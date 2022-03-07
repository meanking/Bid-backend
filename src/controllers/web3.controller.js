import { body, query, validationResult } from 'express-validator';

import {
    web3Service,
} from '../services';

export const web3Controller = () => {
    const getUserBidInfo = async (req, res, next) => {
        try {
            const { address } = req.params;
            console.log('address -', address);

            const result = await web3Service().getUserBidInfo(address);
            console.log('result -', result);

            res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    const delegateBid = async (req, res, next) => {
        try {
            const { address, value, r, s, v } = req.body;
            const result = await web3Service().delegateBid(address, value, r, s, v);

            res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    return {
        delegateBid,
        getUserBidInfo
    };
};
