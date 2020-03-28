import { AzureFunction, Context, HttpRequest } from '@azure/functions'

const httpTrigger: AzureFunction = async (
  context: Context,
  req: HttpRequest,
): Promise<void> => {
  context.log('Translating ZIP to provinceID')
  const zip = req.query.zip || (req.body && req.body.zip)
  //Check if ZIP is given
  if (!zip) {
    context.res = {
      status: 400,
      body: {
        success: 0,
        content: {
          errorMessage: 'No ZIP code given!',
        },
      },
    }
    return
  }
  // Check if the zip code is a five number construct
  if (isNaN(zip) || !(zip + '').length || (zip + '').length !== 5) {
    context.res = {
      status: 400,
      body: 'Not a valid zip code',
    }
    return
  }
}

export default httpTrigger
