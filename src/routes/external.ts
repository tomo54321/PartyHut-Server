import { Router } from 'express';
import { query } from 'express-validator';
import { SearchYouTube } from '../controllers/external';
import { ValidateErrors } from '../middleware/validateErrors';
import { isAuth } from '../middleware/isAuth';
export const ExternalRouter = Router();

ExternalRouter.get(
    "/youtube/search",
    query("query")
        .isString()
        .withMessage("Please enter a valid search query"),
    ValidateErrors,
    isAuth,
    SearchYouTube
)