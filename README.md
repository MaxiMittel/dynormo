<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/MaxiMittel/dynormo">
    <img src="images/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Dynormo</h3>

  <p align="center">
    Typesafe ORM for AWS DynamoDB
    <br />
    <a href="https://github.com/MaxiMittel/dynormo/wiki"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/MaxiMittel/dynormo/wiki/Getting-started">Get Started</a>
    ·
    <a href="https://github.com/MaxiMittel/dynormo/issues">Report Bug</a>
    ·
    <a href="https://github.com/MaxiMittel/dynormo/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#configuration">Configuration</a></li>
        <li><a href="#usage">Usage</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Dynormo is an open-source GitHub project that offers developers a robust object-relational mapping (ORM) library designed specifically for DynamoDB, the popular NoSQL database service provided by Amazon Web Services (AWS). With Dynormo, you can effortlessly interact with DynamoDB using a typesafe and intuitive approach, enabling you to work with your data in a strongly-typed manner.

One of the key features of Dynormo is its type safety. By leveraging the type system of the programming language you're using, Dynormo ensures that your code is free from runtime type errors when interacting with DynamoDB. This prevents common pitfalls such as mismatched data types, missing attributes, or incorrect queries, providing you with a more reliable and predictable development experience.

Dynormo also offers an intuitive API that closely aligns with the DynamoDB data model. It provides a set of high-level abstractions for common database operations such as querying, inserting, updating, and deleting data. These abstractions make it easier to express your intent in code and reduce the boilerplate typically associated with low-level DynamoDB interactions.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

### Installation

To start using Dynormo in your project, you need to install it via npm. Open your terminal and run the following command:

```bash
npm install dynormo --save-dev
```

### Configuration

Before you can start using Dynormo, you need to configure a few things.

#### Config file

Create a configuration file called `dynormo.config.json` at the root of your project. This file will contain some configurations need for you `DynormoClient`. You can read more about the configuration file in the [Configuration](Configuration.md) section.

```json
{
    "entities": ["entities/User.json"]
}
```

#### Entity definition

Create a file called `User.json` in a folder called `entities` at the root of your project. This file will contain the definition of your `User` entity. You can read more about entity definitions in the [Entities](Entities.md) section.
Link this entity and all other entities to the `entities` array in the `dynormo.config.json` file.

```json
{
    "name": "User",
    "table": "dynormo-users",
    "attributes": {
        "partitionKey": {
            "type": "string",
            "partitionKey": true,
            "generator": "UUID"
        },
        "stringAttr1": {
            "type": "string"
        }
    }
}
```

#### Generate type definitions

The last thing you need to do is generate the type definitions for your entities. This is done by running the following command in your terminal:

```bash
npx dynormo generate
```

This will generate all the type definitions and code needed to interact with your DynamoDB tables inside your `node_modules` folder. You can read more about the `generate` command in the [CLI](Cli.md) section.

#### DynormoClient

The last thing you need to do is create a `DynormoClient` instance. This is the main entry point for interacting with Dynormo.
It is recommended to create a single `DynormoClient` instance and reuse it throughout your application. You can read more about the `DynormoClient` in the [DynormoClient](DynormoClient.md) section.

```typescript
import { DynormoClient } from '.dynormo'

const client = new DynormoClient({
    client: new DynamoDBClient({
        region: 'eu-central-1',
    }),
})
```

### Usage

Now that you have everything set up, you can start using Dynormo to interact with your DynamoDB tables. Let's create a new user in the `dynormo-users` table.

```typescript
import { DynormoClient } from '.dynormo'

const client = new DynormoClient({
    client: new DynamoDBClient({
        region: 'eu-central-1',
    }),
})

const user = await client.user.create({
    stringAttr1: 'Hello World!',
})
```

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Maximilian Mittelhammer - [LinkedIn](https://www.linkedin.com/in/maximilian-mittelhammer-6a0278130/) - maximittel@outlook.de

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/MaxiMittel/dynormo.svg?style=for-the-badge
[contributors-url]: https://github.com/MaxiMittel/dynormo/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/MaxiMittel/dynormo.svg?style=for-the-badge
[forks-url]: https://github.com/MaxiMittel/dynormo/network/members
[stars-shield]: https://img.shields.io/github/stars/MaxiMittel/dynormo.svg?style=for-the-badge
[stars-url]: https://github.com/MaxiMittel/dynormo/stargazers
[issues-shield]: https://img.shields.io/github/issues/MaxiMittel/dynormo.svg?style=for-the-badge
[issues-url]: https://github.com/MaxiMittel/dynormo/issues
[license-shield]: https://img.shields.io/github/license/MaxiMittel/dynormo.svg?style=for-the-badge
[license-url]: https://github.com/MaxiMittel/dynormo/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/othneildrew
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.io/
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Laravel.com]: https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white
[Laravel-url]: https://laravel.com
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[JQuery.com]: https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white
[JQuery-url]: https://jquery.com
