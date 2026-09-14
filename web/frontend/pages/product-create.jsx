import React from 'react';
import { Page, Card, Text } from '@shopify/polaris';

export default function ProductCreate() {
  return (
    <Page fullWidth title="Add product">
      <Card sectioned>
        <Text as="p">If you can see this, the routing works and the error is in the original JSX.</Text>
      </Card>
    </Page>
  );
}
