import { request, gql } from 'graphql-request';

const graphqlAPI = "https://api-eu-west-2.graphcms.com/v2/ckz4epj4j007701z890df3rzc/master";

export const getPosts = async () => {
  const query = gql`
    query MyQuery {
      postsConnection {
        edges {
          cursor
          node {
            author {
              bio
              name
              id
              photo {
                url
              }
            }
            createdAt
            slug
            title
            excerpt
            featuredImage {
              url
            }
            categories {
              name
              slug
            }
          }
        }
      }
    }
  `;

  const result = await request(graphqlAPI, query);

  return result.postsConnection.edges;
};


export const getRecentPosts = async () => {
    const query = gql `
        query GetPostDetails() {
            posts(orderBy: createdAt_ASC
                last: 3
            ) {
                title 
                featuredImage {
                    url
                }
                createdAt 
                slug
            }
        }
    `
    const result = await request(graphqlAPI, query);
    return result.posts;
}

export const getSimilarPosts = async () => {
    const query = gql `
        query GetPostDetails($slug: String!, $categories: [String!]) {
            posts(
                where: { slug_not: $slug, AND: { categories_some: { slug_in: $categories}}}
                last: 3
            ) {
                title 
                featuredImage {
                    url
                }
                createdAt 
                slug
            }
        }
    `
    const result = await request(graphqlAPI, query);
    return result.posts;
}
