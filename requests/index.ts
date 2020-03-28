import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import * as jwt from 'jsonwebtoken'
import * as mongodb from 'mongodb'

let client: mongodb.MongoClient = null

const httpTrigger: AzureFunction = async (
  context: Context,
  req: HttpRequest,
): Promise<void> => {
  context.log('HTTP trigger function processed a request.')

  // Check if there is a body attached to the request
  if (!req.body) {
    context.res = {
      status: 400,
      body: {
        success: 0,
        content: {
        errorMessage : 'The request body is empty',
        }
      }
    }
    return
  }

  // Check if a token is provided
  if (!req.body.token) {
    context.res = {
      status: 401,
      body: {
        success: 0,
        content: {
        errorMessage : 'No Token provided',
        }
      }
    }
    return
  }

  // Authenticate using jwt
  try {
    jwt.verify(req.body.token, process.env['JWT_KEY'])
  } catch (err) {
    context.res = {
      status: 401,
      body: 'Could not authenticate token',
    }
    return
  }

  const phoneNumber = req.body.phone

  // Check if phone number is not empty or not a string
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    context.res = {
      status: 400,
      body: {
        success: 0,
        content: {
        errorMessage : 'The phone number is empty',
        }
      }
    }
    return
  }

  const firstTwo = phoneNumber.substring(0, 2)
  let firstFour = phoneNumber.substring(0, 4)

  // Check if the number is a german number
  if (firstTwo === '00' && firstFour !== '0049') {
    context.res = {
      status: 400,
      body: {
        success: 0,
        content: {
          errorMessage: 'Not a german number'
        }
      }
    }
    return
  } else if (firstFour === '0049') {
    firstFour = '0' + phoneNumber.substring(4, 7)
  }

  // Check for expensive numbers
  switch (firstFour) {
    case '0137':
    case '0700':
    case '0900':
    case '0180':
    case '0190':
    case '1180':
      context.res = {
        status: 400,
        body: {
          success: 0,
          content: {
          errorMessage: 'This phone number is not allowed'
          }
        }
      }
      return
  }

  const zip = req.body.zip
  const request = req.body.request

  // Check if zip code and request exist
  if (!zip || !request) {
    context.res = {
      status: 400,
      body: 'Zip code or request is missing',
    }
    return
  }

  // Check if the zip code is a five number construct
  if (isNaN(zip) || !(zip + '').length || (zip + '').length !== 5) {
    context.res = {
      status: 400,
      body: {
        success: 0, 
        content: {
          errorMessage:'Not a valid zip code'
        }
      }
    }
    return
  }

  // Check if the request code is a number between -1 and 9
  if (isNaN(request) || request < -1 || request > 9) {
    context.res = {
      status: 400,
      body: {
        success: 0, 
        content: {
          errorMessage:'Not a valid request code'
        }
      }
    }
    return
  }

  if (client == null) {
    try {
      client = await mongodb.MongoClient.connect(process.env['DB'], {
        useUnifiedTopology: true,
        useNewUrlParser: true,
      })

      context.log('Instantiated a new mongodb client')
    } catch (err) {
      context.res = {
        status: 500,
        body: 'Something went wrong',
      }
      return
    }
  } else {
    context.log('Reused mongodb client')
  }
  if (client == null) {
    try {
      client = await mongodb.MongoClient.connect(process.env['DB'], {
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
            errorMessage: 'Something went wrong'
          }
        }
      }
      return
    }
  } else {
    context.log('Reused mongodb client')
  }
  let provinceCode;
  try {
    const provinceCode = await client.db('coronadb').collection('regions').findOne({zipCode: zip})
    if(!provinceCode) {
      context.res = {
        status: 404,
        body: {
          success: 0,
          content: {
            errorMessage: "provinceID was not found"
          }
        }
      }
    }
    context.log('Found provinceID')
  } catch (err) {
      context.log(err)
      context.res = {
        status: 500,
        body: {
          success: 0,
          content : {
            error_message: "Something went wrong"
          }
        }
      }
  }
  try {
    await client.db('coronadb').collection('requests').insertOne({
      timestamp: Date.now(),
      phone: phoneNumber,
      province: provinceCode,
      request: request,
      __v: 1,
    })

    context.log('Created a new document')
  } catch (err) {
    context.log(err)
    context.res = {
      status: 500,
      body: {
        success: 0,
        content: {
          errorMessage : 'Something went wrong'
        }
      }
    }
    return
  }

  context.res = {
    status: 200,
    body: {
      success: 1,
      content: {
        message: "Successfully added call."
      }
    }
  }
  return
}


export default httpTrigger

