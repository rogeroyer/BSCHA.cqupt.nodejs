create (n:root{name:'BSCHA'}),
       (n)-[:specialize]->(:class{name:'species',patterns:'{"name":"[\\w\\d_]+","description":".*"}'}),
       (n)-[:specialize]->(:class{name:'training',patterns:'{"data":"\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*(\\n\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*)*"}'}),
       (n)-[:specialize]->(:class{name:'applying',patterns:'{"data":"\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*(\\n\\s*(((\\d+[\\.\\,]\\d+)|(\\d+))\\s+((\\d+[\\.\\,]\\d+)|(\\d+)))\\s*)*"}'})