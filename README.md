# Serverless Framework - Generate PDF in AWS Lambda with Chromium and Mustache

Main takeaways:

### 1 - Serverless Framework Packaging

As described in the [Serverless Framework Packaing Guide](https://www.serverless.com/framework/docs/providers/aws/guide/packaging/): "...Serverless will auto-detect and exclude development dependencies based on the runtime your service is using.", that means, for Node.js projects, everything inside `devDependencies` **will not be included** in your bundle.

In our case, we do want to deploy our main packages, we need to declare in our `package.json`:

```json
...
"dependencies": {
  "chrome-aws-lambda": "2.1.1",
  "mustache": "4.0.1",
  "puppeteer-core": "2.1.1"
}
...
```

As descrived on `chrome-aws-lambda` [repository](https://github.com/alixaxel/chrome-aws-lambda): "This package is versioned based on the underlying puppeteer minor version...", to avoid headaches we are keeping the versions in sync.

Everything else that you may use for development or testing should be installed in **devDependencies**

### 2 - Teach API Gateway to respond in Binary Formats

Using Amazon API Gateway, we need to define each method or resource we want to create and respond to, for example: "on path '/my-path' respond with HTTP method GET accepting formats text/html". We could break it down in at least 3 parts: 1) a path, 2) a method, and 3) a request format.

Serverless Framework takes care of all of it for us and API Gateway by default treats message body as text payloads. To enable any other responses from your AWS Lambda (e.g. JPEG, GZip or XML file), you need to enable binary media types in API Gateway.

Again, Serverless Framework make it easy for us to implement that. In your `serverless.yml` you can define:

```yml
provider:
  apiGateway:
    binaryMediaTypes:
      - '*/*'
```

With that, API Gateway will look at the **response Content-Type** and **request Accept** HTTP headers to decide which media types should be converted from text to binary.

We are using `*/*` here, because when you perform a GET request from a browser navigation bar (e.g. in Firefox, Chrome etc) they usually do not send `application/pdf`, because there is no format extension in the URL. These requests fell under `*/*`.


### 3 - LAMBDA-PROXY response requires correct Content-Type, body format and encode flag

We are using [LAMBDA-PROXY integration](https://dev.to/oieduardorabelo/aws-serverless-3-aspectos-importantes-ao-projetar-uma-api-serverless-30mg) and crafting the request response inside our lambda. We want it to return a binary type and to do that, we need to respond with the correct **Content-Type** header, in our case, it will be **application/json**.

In this case, we want to return a PDF file as part of the body response (enabling the Browser to render the PDF in a Tab), we will need to convert it to **Base64**.

The [input format](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format) of a Lambda function with [proxy integration event](https://github.com/serverless/serverless/blob/fb4ea153f0a30f18aad5b93456a1b26ed2d189ac/docs/providers/aws/events/apigateway.md#example-lambda-proxy-event-default), includes a flag called `isBase64Encoded`.

We need to return this flag with a value of `true`, to tell API Gateway to convert from **Base64** to binary.

Lambda communicates with API Gateway via a text base interface and API Gateway communicates with any client converting the response to them.

With that in mind, we need to build our response like:

```js
{
  statusCode: 200,
  body: pdf.toString("base64"),
  headers: {
    "Content-Type": "application/pdf",
  },
  isBase64Encoded: true,
};
```

The `pdf.toString("base64")` is based on `pupperter` API, [visit their docs for more information](https://github.com/puppeteer/puppeteer).
