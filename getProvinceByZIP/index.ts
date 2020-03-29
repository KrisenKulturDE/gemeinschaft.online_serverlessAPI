import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import * as mongodb from 'mongodb'

let client: mongodb.MongoClient | null = null
const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest,
): Promise<void> {
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
  if (client == null) {
    try {
      client = await mongodb.MongoClient.connect(process.env['DB'] as string, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
      })

      context.log('Instantiated a new mongodb client')
    } catch (err) {
      context.res = {
        status: 500,
        body: {
          success: 0,
          content: {
            errorMessage: 'Something went wrong',
          },
        },
      }
      return
    }
  } else {
    context.log('Reused mongodb client')
  }
  try {
    const provinceCode = await client
      .db('coronadb')
      .collection('calls')
      .findOne({ zipCode: zip })
    if (provinceCode) {
      context.res = {
        status: 200,
        body: {
          success: 1,
          content: {
            provinceId: provinceCode,
          },
        },
      }
    } else {
      context.res = {
        status: 404,
        body: {
          success: 0,
          content: {
            errorMessage: 'provinceID was not found',
          },
        },
      }
    }
    context.log('Found provinceID')
  } catch (err) {
    context.log(err)
    context.res = {
      status: 500,
      body: {
        success: 0,
        content: {
          errorMessage: 'Something went wrong',
        },
      },
    }
  }
  return
}

export default httpTrigger
