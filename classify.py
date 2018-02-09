# -*- coding: utf-8 -*-
"""
Created on Fri Feb  2 12:30:13 2018

@author: CCL
"""

from neo4j.v1 import GraphDatabase
import pandas as pd
from sklearn import preprocessing
import random
from sklearn.linear_model import BayesianRidge
from sklearn.model_selection import KFold
import numpy as np
import re
import sys
import json
import re

uri = "bolt://localhost"
driver = GraphDatabase.driver(uri, auth=("bscha", "bscha"))

def model_BayesianRidge(x_train,y_train,x_test,y_test):#93
    bst = BayesianRidge(n_iter=1000, tol=0.4, alpha_1=1e-04, alpha_2=1e-06, lambda_1=1e-04, lambda_2=1e-06, 
                        compute_score=False, fit_intercept=True, normalize=False, copy_X=True, verbose=False).fit(x_train,y_train)
    predict = bst.predict(x_test)
    return predict
#%%
def creat_train_set():
    with driver.session() as session:
        with session.begin_transaction() as tx:
            human_id = None
            labels = []
            ALL_feature = []
            for record in tx.run("match (:root{name:'BSCHA'})-[:specialize]->(:class{name:'species'})-[:implement]->(n:instance) where n.name='人类' return id(n)"):
                human_id = int(record[0])
            for record in tx.run("match (:root{name:'BSCHA'})-[:specialize]->(:class{name:'training'})-[:implement]->(n:instance) return n.species,n.data"):
#                print(record)
                tmp_dict = []
                check_one_sample = dict()
                for index,line in enumerate(record[1].strip().split('\n')):
                    #print('-----',line,'    len',len(line))
#                    print(line.split('\t')[0].replace(',','.'))
                    flag_key = float(re.split('\s+',line.strip())[0].replace(',','.').strip())
                    if (flag_key<401) | (flag_key>=1778) | ('\t' not in line):
                        continue
                    check_one_sample[float(line.split('\t')[0].replace(',','.'))] = float(line.split('\t')[1].replace(',','.'))
                check_one_sample = sorted(check_one_sample.items()) 
                for key_value in check_one_sample:
                    tmp_dict.append(key_value[1])
                if len(tmp_dict)<700:
                    continue
                ALL_feature.append(tmp_dict)
                if human_id == int(record[0]):
                    labels.append(1)
                else:
                    labels.append(0)
            all_data = pd.DataFrame(ALL_feature)
            if all_data.shape[0]==0:
                raise 'No Train Data'
            if ((sum(labels) == len(labels)) | (sum(labels) == 0)):
                
                return_json = {}
                return_json["success"]=False
                return_json["message"]="目前数据库只有一个物种，请上传多个物种！"
                print(json.dumps(return_json))
                return -1
            all_data = pd.concat([pd.DataFrame(labels),all_data],axis=1,ignore_index=True)
            all_data = all_data.fillna(all_data.mean())
    
            all_data = all_data.values
            train_data,label = all_data[:,1:],all_data[:,0]
            return [train_data,label,all_data]
        
#%%
def confuse_matrix(pred,real):
    result = pd.DataFrame([[0,0],[0,0]]).values
    for i in range(len(real)):
        if ((pred[i]==1)&(real[i]==1)):
            result[1,1]+=1
        elif ((pred[i]==0)&(real[i]==0)):
            result[0,0]+=1
        elif ((pred[i]==0)&(real[i]==1)):
            result[0,1]+=1
        elif ((pred[i]==1)&(real[i]==0)):
            result[1,0]+=1
    return result


def acc(confuse):
    return (confuse[0,0]+confuse[1,1])*1.0/(confuse[0,0]+confuse[1,1]+confuse[0,1]+confuse[1,0])
#%%
def cross_val(train_data,label):
    vfunc = np.vectorize(lambda x:1 if x>0.7 else 0)
    kf = KFold(n_splits=5,random_state=8,shuffle=True)
    index_list = []
    all_result = []
    acc_list = []
    gailv = []
    for train_index, test_index in kf.split(train_data):
        x_train, x_test = train_data[train_index], train_data[test_index]
        y_train, y_test = label[train_index], label[test_index]
        index_list.extend(test_index)
        scaler = preprocessing.StandardScaler().fit(x_train)
        x_train = scaler.transform(x_train)
        x_test = scaler.transform(x_test)
        print('ratio',sum(y_train)/len(y_train))
        predict = model_BayesianRidge(x_train,y_train,x_test,None)
        gailv.extend(list(predict))
        pre = vfunc(predict)
    #    pre = exception_check(x_train,y_train,x_test,pre)
        all_result.extend(list(pre))
        confuse= confuse_matrix(pre,y_test)
        print(confuse)
        acc_list.append(acc(confuse))
        print(acc(confuse))
    print('acc mean',np.mean(acc_list))
    
#%%

def creat_test_set(test_id):
    with driver.session() as session:
        with session.begin_transaction() as tx:
            ALL_feature = []
            file_name = []
            continue_list = []
#            print(test_id)
            for record in tx.run("match (n) where id(n) in "+test_id+" return n"):
#                print(record)
                pattern = re.compile(r'data\': .+?\'')
                data = pattern.search(str(record.values()[0])).group(0)[len('data\': \''):-1]
                pattern_id = re.compile(r'Node id=\d+? ')
                record_id = pattern_id.search(str(record.values()[0])).group(0)
                record_id=record_id[len('Node id='):-1]

                tmp_dict = []
                check_one_sample = dict()
                for index,line in enumerate(data.strip('\\r\\n').split('\\r\\n')):
                    flag_key = float(line.strip().split('\\t')[0].replace(',','.'))
                    if (flag_key<401) | (flag_key>=1778) | ('\\t' not in line):
                        continue
                    check_one_sample[float(line.strip().split('\\t')[0].replace(',','.'))] = float(line.strip().split('\\t')[1].replace(',','.'))
                check_one_sample = sorted(check_one_sample.items()) 
                for key_value in check_one_sample:
                    tmp_dict.append(key_value[1])
                if len(tmp_dict)<700:
                    continue_list.append(record_id)
                    continue
                ALL_feature.append(tmp_dict)
                file_name.append(record_id)
            test_data = pd.DataFrame(ALL_feature)
            if test_data.shape[0]==0:
                raise 'No Test Data'
            test_data = test_data.fillna(test_data.mean())
            return test_data,file_name,continue_list
        
        
#%%
def model_G(train_data,label,test_data,test_remain_file_name):
    if train_data.shape[1]>test_data.shape[1]:
        train_data = train_data[:,:test_data.shape[1]]
    else:
        test_data = test_data.iloc[:,:train_data.shape[1]]
    test_data = test_data.values
    scaler = preprocessing.StandardScaler().fit(train_data)
    scaler_train_data = scaler.transform(train_data)
    scaler_x_test = scaler.transform(test_data)
    
    predict = model_BayesianRidge(scaler_train_data,label,scaler_x_test,None)
    anss = pd.DataFrame()
    anss['file'] = test_remain_file_name
    anss['pro'] = predict
    anss['label'] = anss['pro'].map(lambda x:True if x>0.8 else False)
#    anss.to_csv('read_test.csv',index=None)
    return anss
    
#%%
if __name__ == '__main__':
        
    
    rtn = creat_train_set()
    if type(rtn) == type([]):
        train_data,label,all_data = rtn[0],rtn[1],rtn[2]
        test_list = sys.argv[1]
#        test_list =  "[3795]"
    #    key = "match (n) where id(n) in "+str(test_list)+" return n.id,n.data"
    #    key = "match (n) where id(n) in [2080,2081] return n.id,n.data"
        test_data,file_name,continue_list = creat_test_set(test_list)
        ans = model_G(train_data,label,test_data,file_name)
        
        name_list = list(ans.file)
        label_list = list(ans.label)
        ratio_list = list(ans.pro)
        ans_dict = dict(zip(name_list,label_list))
        ratio_dict = dict(zip(name_list,ratio_list))
        json_ans = []
        for parms_order in test_list.strip('\"[').strip(']\"').split(','):
            tmp_dict = {}
            tmp_dict["normalized"] = not not ans_dict.get(parms_order,False)
            tmp_dict["probability"] = ratio_dict.get(parms_order,0)
            json_ans.append(tmp_dict)
            
        
        return_json = {}
        return_json["success"]=True
        return_json["message"]="分类完成"
        return_json["result"]=json_ans
        return_json = json.dumps(return_json)
        print(return_json)
    
    