//init
CREATE (n:root {name: 'BSCHA'}),
       (n)-[:specialize]->(n1:class {name: 'species', patterns: '{"name":".+"}'}),
       (n1)-[:implement]->(:instance {name: 'human'}),
       (n1)-[:implement]->(:instance {name: 'animal'}),
       (n)-[:specialize]->(:class {name: 'training', patterns: '{"name":".+","data":"\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*(\\n\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*)*"}'}),
       (n)-[:specialize]->(:class {name: 'applying', patterns: '{"name":".+","data":"\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*(\\n\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*)*"}'})

//query training data
MATCH (:root {name: 'BSCHA'})-[:specialize]->(:class {name: 'training'})-[:implement]->(n:instance)
RETURN n.species, n.data;

//query human id
MATCH
  (:root {name: 'BSCHA'})-[:specialize]->(:class {name: 'species'})-[:implement]->(n:instance)
  WHERE n.name = 'human'
RETURN id(n);

//query applying data by id