MATCH (:root {name: 'BSCHA'})-[:specialize]->(:class {name: 'training'})-[:implement]->(n:instance)
RETURN n.species, n.data;

MATCH
  (:root {name: 'BSCHA'})-[:specialize]->(:class {name: 'species'})-[:implement]->(n:instance)
  WHERE n.name = 'human'
RETURN id(n);

MATCH (:root {name: 'BSCHA'})-[:specialize]->(:class {name: 'applying'})-[:implement]->(n:instance)
RETURN id(n), n.data;