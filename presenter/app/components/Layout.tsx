import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default (props) =>
  <div className="wrapper">
    <Head>
      <title>BenangMerah</title>
      <link rel="stylesheet" href="/static/css/style.css" />
    </Head>
    <header className="container site-header">
      <h1>
        <Link href="/">
          <a>Benang<span>Merah</span></a>
        </Link>
      </h1>
      <hr />
    </header>
    <div className="container">
      {props.children}
    </div>
  </div>