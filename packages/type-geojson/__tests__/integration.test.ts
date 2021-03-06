jest.setTimeout(20000);

import gql from 'graphql-tag';
import prepare from './integration-prepare';

jest.setTimeout(10000);

const testInstance = prepare();
let query, mutate, connectToDatabase;

beforeAll(async () => {
  const instance = await testInstance.start();
  query = instance.query;
  mutate = instance.mutate;
  connectToDatabase = instance.connectToDatabase;

  const DB = await connectToDatabase();
  await DB.collection('pois').createIndex({ place: '2dsphere' });
  await DB.collection('area').createIndex({ place: '2dsphere' });
});

afterAll(async () => {
  await testInstance.stop();
});

test('Poi create', async () => {
  [
    [0, 0],
    [0, 50],
    [50, 50],
    [50, 0],
  ].forEach(async coordinates => {
    const coordsStr = coordinates.join(',');
    const { errors, data } = await mutate({
      mutation: gql`
        mutation {
          createPoi(
            data: {
              title: "poi ${coordsStr}"
              place: { type: Point, coordinates: [${coordsStr}] }
            }
          ) {
            title
            place{
              type
              coordinates
            }
          }
        }
      `,
      variables: { coordinates },
    });
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      createPoi: {
        place: {
          coordinates: [coordinates[0], coordinates[1]],
          type: 'Point',
        },
        title: `poi ${coordsStr}`,
      },
    });
  });
});

test('Create Poi with area', async () => {
  const { errors, data } = await mutate({
    mutation: gql`
      mutation {
        createPoi(
          data: {
            title: "poi with area"
            area: {
              type: Polygon
              coordinates: [[[0, 0], [0, 50], [50, 50], [50, 0], [0, 0]]]
            }
          }
        ) {
          title
          area {
            type
            coordinates
          }
        }
      }
    `,
    variables: {},
  });
  expect(errors).toBeUndefined();
  expect(data).toMatchInlineSnapshot(`
    Object {
      "createPoi": Object {
        "area": Object {
          "coordinates": Array [
            Array [
              Array [
                0,
                0,
              ],
              Array [
                0,
                50,
              ],
              Array [
                50,
                50,
              ],
              Array [
                50,
                0,
              ],
              Array [
                0,
                0,
              ],
            ],
          ],
          "type": "Polygon",
        },
        "title": "poi with area",
      },
    }
    `);
});

test('Update Poi with area', async () => {
  const { data } = await query({
    query: gql`
      query {
        pois {
          id
        }
      }
    `,
    variables: {},
  });
  const poiId = data.pois[0].id;

  {
    const { errors, data } = await mutate({
      mutation: gql`
        mutation($poiId: ObjectID!) {
          updatePoi(
            where: { id: $poiId }
            data: { area: { type: Polygon, coordinates: [[[0, 0], [0, 50]]] } }
          ) {
            area {
              type
              coordinates
            }
          }
        }
      `,
      variables: { poiId },
    });
    expect(errors).toBeUndefined();
    expect(data).toMatchInlineSnapshot(`
        Object {
          "updatePoi": Object {
            "area": Object {
              "coordinates": Array [
                Array [
                  Array [
                    0,
                    0,
                  ],
                  Array [
                    0,
                    50,
                  ],
                ],
              ],
              "type": "Polygon",
            },
          },
        }
    `);
  }
});

test('Near', async () => {
  const { errors, data } = await query({
    query: gql`
      query {
        pois(
          where: {
            place_near: {
              geometry: { type: Point, coordinates: [0, 51] }
              maxDistance: 5000000
            }
          }
        ) {
          title
        }
      }
    `,
    variables: {},
  });
  expect(errors).toBeUndefined();
  expect(data).toMatchInlineSnapshot(`
    Object {
      "pois": Array [
        Object {
          "title": "poi 0,50",
        },
        Object {
          "title": "poi 50,50",
        },
      ],
    }
  `);
});

test('Within', async () => {
  {
    const { errors, data } = await query({
      query: gql`
        query {
          pois(
            where: {
              place_within: {
                geometry: {
                  type: Polygon
                  coordinates: [
                    [[49, 51], [51, 51], [51, 49], [49, 49], [49, 51]]
                  ]
                }
              }
            }
          ) {
            title
          }
        }
      `,
      variables: {},
    });
    expect(errors).toBeUndefined();
    expect(data).toMatchInlineSnapshot(`
      Object {
        "pois": Array [
          Object {
            "title": "poi 50,50",
          },
        ],
      }
    `);
  }
  {
    const { errors, data } = await query({
      query: gql`
        query {
          pois(
            where: {
              place_within: {
                geometry: {
                  type: Polygon
                  coordinates: [[[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]]]
                }
              }
            }
          ) {
            title
          }
        }
      `,
      variables: {},
    });
    expect(errors).toBeUndefined();
    expect(data).toMatchInlineSnapshot(`
          Object {
            "pois": Array [
              Object {
                "title": "poi 0,0",
              },
            ],
          }
        `);
  }
});

test('Intersects', async () => {
  {
    const { errors, data } = await query({
      query: gql`
        query {
          pois(
            where: {
              area_intersects: { point: { type: Point, coordinates: [25, 25] } }
            }
          ) {
            title
          }
        }
      `,
      variables: {},
    });
    expect(errors).toBeUndefined();
    expect(data).toMatchInlineSnapshot(`
    Object {
      "pois": Array [
        Object {
          "title": "poi with area",
        },
      ],
    }
    `);
  }
  {
    const { errors, data } = await query({
      query: gql`
        query {
          pois(
            where: {
              area_intersects: { point: { type: Point, coordinates: [55, 25] } }
            }
          ) {
            title
          }
        }
      `,
      variables: {},
    });
    expect(errors).toBeUndefined();
    expect(data).toMatchInlineSnapshot(`
    Object {
      "pois": Array [],
    }
    `);
  }
});

test('Intersects input error', async () => {
  const { errors } = await query({
    query: gql`
      query {
        pois(
          where: {
            area_intersects: {
              point: { type: Point, coordinates: [25, 25] }
              polygon: { type: Polygon, coordinates: [[[25, 25]]] }
            }
          }
        ) {
          title
        }
      }
    `,
    variables: {},
  });
  expect(errors).toMatchInlineSnapshot(`
    Array [
      Object {
        "extensions": Object {
          "code": "BAD_USER_INPUT",
        },
        "locations": Array [
          Object {
            "column": 3,
            "line": 2,
          },
        ],
        "message": "You should fill only one field",
        "path": Array [
          "pois",
        ],
      },
    ]
    `);
});
