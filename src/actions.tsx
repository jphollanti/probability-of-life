
export const UPDATE_AMOUNT_OF_STARS = 'UPDATE_AMOUNT_OF_STARS';
export type UPDATE_AMOUNT_OF_STARS = typeof UPDATE_AMOUNT_OF_STARS;

export interface UpdateAmountOfStars {
    type: UPDATE_AMOUNT_OF_STARS, 
    amountOfStars: number
}

export type UpdateAmountOfStarsAction = UpdateAmountOfStars;

export function updateAmountOfStars(amountOfStars:number): UpdateAmountOfStars {
    return {
        type: UPDATE_AMOUNT_OF_STARS, 
        amountOfStars
    }
}
