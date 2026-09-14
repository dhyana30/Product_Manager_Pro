import { Badge, Card, IndexTable, Text } from "@shopify/polaris";

export function OperationsTable({ title, resourceName, columns, rows, onSelect }) {
  return (
    <Card>
      <Card.Section>
        <Text as="h2" variant="headingMd">{title}</Text>
      </Card.Section>
      <IndexTable
        resourceName={resourceName}
        itemCount={rows.length}
        selectable
        headings={columns.map(({ title: heading }) => ({ title: heading }))}
        onSelectionChange={(selectionType, selected) => {
          if (selectionType === "single") onSelect?.(rows[selected]);
        }}
      >
        {rows.map((row, index) => (
          <IndexTable.Row id={String(row.id)} key={row.id} position={index}>
            {columns.map(({ key, badge }) => (
              <IndexTable.Cell key={key}>
                {badge ? <Badge status={row[key].status}>{row[key].label}</Badge> : <Text as="span">{row[key]}</Text>}
              </IndexTable.Cell>
            ))}
          </IndexTable.Row>
        ))}
      </IndexTable>
    </Card>
  );
}
