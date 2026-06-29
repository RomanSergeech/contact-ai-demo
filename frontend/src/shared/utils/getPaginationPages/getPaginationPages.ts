import { arrayFromTo } from '../arrayFromTo/arrayFromTo'

export const getPaginationPages = (page: number, pages: number): (number | 'ellipsis')[] =>
  arrayFromTo(1, pages).reduce<(number | 'ellipsis')[]>((acc, num) => {
    if (pages > 5 && num !== 1 && num !== pages &&
        !(num === page - 1 || num === page || num === page + 1)) {
      if (num === page - 2 || num === page + 2) acc.push('ellipsis')
      return acc
    }
    acc.push(num)
    return acc
  }, [])
