import * as React from 'react';
import Head from 'next/head';
import { basename } from 'path';
import Layout from '../components/Layout';
import LineChart from '../components/charts/LineChart';

const Resource: any = (props: any) =>
  <Layout>
    <Head>
      <title>{props.title} - BenangMerah</title>
    </Head>
    <h4>{props.title}</h4>
    <p>Stub for resource page: <kbd>{props.id}</kbd></p>
    <LineChart />
  </Layout>

Resource.getInitialProps = async (context) => {
  let id = context.query.id;
  const tempTitle = basename(id);
  return {
    id,
    title: tempTitle
  };
}

export default Resource;