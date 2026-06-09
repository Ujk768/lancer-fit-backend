import { Request, Response } from "express";

export const joinPersonalChallenge = async(req: Request, res: Response) => {
    try{
          
    }catch(err){
        res.status(500).json({ message: 'Error joining personal challenge', error: err });
    }
}

export const joinTLCChallenge = async(req: Request, res: Response) => {}

export const addPersoanlChanllengePoints = async(req: Request, res: Response) => {}

export const getPersonalChallengePoints = async(req: Request, res: Response) => {}

